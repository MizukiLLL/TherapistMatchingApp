import { realTherapists } from './realTherapists.js';
export const therapists = realTherapists;
export function sendJson(response, statusCode, payload) {
    response.statusCode = statusCode;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(payload));
}
export async function readJsonBody(request) {
    if (request.body && typeof request.body === 'object')
        return request.body;
    if (typeof request.body === 'string')
        return request.body.trim() ? JSON.parse(request.body) : {};
    return new Promise((resolve, reject) => {
        let rawBody = '';
        request.on('data', (chunk) => {
            rawBody += chunk.toString('utf8');
        });
        request.on('end', () => {
            try {
                resolve(rawBody.trim() ? JSON.parse(rawBody) : {});
            }
            catch {
                reject(new Error('Request body must be valid JSON.'));
            }
        });
        request.on('error', reject);
    });
}
export function normalize(value) {
    return typeof value === 'string' ? value.trim() : '';
}
export async function pushPreferencesToJotform(record) {
    const apiKey = process.env.JOTFORM_API_KEY;
    const formId = process.env.JOTFORM_FORM_ID;
    const fieldMapJson = process.env.JOTFORM_FIELD_MAP;
    if (!apiKey || !formId || !fieldMapJson)
        return;
    let fieldMap;
    try {
        fieldMap = JSON.parse(fieldMapJson);
    }
    catch (error) {
        console.warn('[jotform-mirror] JOTFORM_FIELD_MAP is not valid JSON; skipping push.', error);
        return;
    }
    const lifeAspects = (record.lifeAspectsByCategory ?? {});
    const concernsSummary = [
        ...((lifeAspects.symptomsAndDiagnoses) ?? []),
        ...((lifeAspects.lifeStagesAndTransitions) ?? []),
        ...((lifeAspects.physicalHealthRelatedIssues) ?? []),
        ...((lifeAspects.selfIdentityAndSocialRelationships) ?? []),
    ].map(String).join(', ');
    const styles = Array.isArray(record.cnipConversationStyles) ? record.cnipConversationStyles.map(String) : [];
    const vector = record.userStyleVector ?? null;
    const cnipStyleSummary = [
        styles.length ? `Picked styles: ${styles.join(', ')}` : 'Picked styles: none',
        vector
            ? `Vector — directive: ${vector.therapist_directive}, emotional: ${vector.emotionally_intensive}, past-focused: ${vector.past_focused}, support-focused: ${vector.support_focused}`
            : 'Vector: not scored',
    ].join(' | ');
    const logistics = (record.logistics ?? {});
    const body = new URLSearchParams();
    const set = (key, value) => {
        const id = fieldMap[key];
        if (id === undefined || id === null || id === '')
            return;
        body.set(`submission[${id}]`, value);
    };
    set('email', normalize(record.email));
    set('areaCode', normalize(record.areaCode));
    set('preferredLanguage', normalize(record.preferredLanguage));
    set('therapyFor', normalize(record.therapyFor));
    set('carePreference', normalize(record.carePreference));
    set('paymentPreference', normalize(logistics.paymentPreference));
    set('availability', normalize(logistics.availability));
    set('concernsSummary', concernsSummary);
    set('cnipStyle', cnipStyleSummary);
    set('submissionJson', JSON.stringify(record));
    const mappedKeys = Array.from(body.keys()).map((key) => key.replace(/^submission\[/, '').replace(/\]$/, ''));
    console.log(`[jotform-mirror] attempt form=${formId} fields=${mappedKeys.join(',')}`);
    try {
        const result = await fetch(`https://api.jotform.com/form/${formId}/submissions?apiKey=${encodeURIComponent(apiKey)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });
        const responseText = await result.text().catch(() => '');
        if (!result.ok) {
            console.warn(`[jotform-mirror] HTTP ${result.status}: ${responseText}`);
        }
        else {
            console.log(`[jotform-mirror] success HTTP ${result.status}: ${responseText.slice(0, 200)}`);
        }
    }
    catch (error) {
        console.warn('[jotform-mirror] request failed:', error);
    }
}
function stringList(value) {
    return Array.isArray(value) ? value.map(String).map((entry) => entry.trim()).filter(Boolean) : [];
}
function overlap(left, right) {
    const rightSet = new Set(right.map((value) => value.toLowerCase()));
    return left.filter((value) => rightSet.has(value.toLowerCase()));
}
function unique(values) {
    const seen = new Set();
    return values.filter((value) => {
        const key = value.toLowerCase();
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function textMatchesAny(text, values) {
    const normalizedText = text.toLowerCase();
    return values.some((value) => normalizedText.includes(value.toLowerCase()));
}
function publicTherapist(therapist) {
    const { insurance: _insurance, ...publicRecord } = therapist;
    return publicRecord;
}
function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
function round2(value) {
    return Math.round(value * 100) / 100;
}
function styleVector(body) {
    const raw = body.userStyleVector && typeof body.userStyleVector === 'object' ? body.userStyleVector : {};
    return {
        therapist_directive: round2(clamp01(Number(raw.therapist_directive ?? 0.5))),
        emotionally_intensive: round2(clamp01(Number(raw.emotionally_intensive ?? 0.5))),
        past_focused: round2(clamp01(Number(raw.past_focused ?? 0.5))),
        support_focused: round2(clamp01(Number(raw.support_focused ?? 0.5))),
    };
}
export function generateIdealProfile(body) {
    const vector = styleVector(body);
    const directive = vector.therapist_directive >= 0.58;
    const intensive = vector.emotionally_intensive >= 0.58;
    const past = vector.past_focused >= 0.55;
    const supportive = vector.support_focused >= 0.58;
    const mainConcerns = stringList(body.therapyTypes).slice(0, 6);
    const modalityPreferenceIds = stringList(body.modalityPreferenceIds);
    const recommendedModalities = modalityPreferenceIds.length
        ? modalityPreferenceIds.slice(0, 4).map((id) => ({
            modalityId: id,
            displayName: id === 'toolsBased' ? 'CBT' : id === 'valuesActionBased' ? 'ACT' : id === 'traumaProcessing' ? 'Trauma-informed therapy' : id === 'relationshipFocused' ? 'IPT' : id === 'somaticRegulation' ? 'Somatic therapy' : id === 'culturallyResponsive' ? 'Culturally responsive therapy' : id === 'neurodiversityAffirming' ? 'Neurodiversity-affirming therapy' : 'Insight-oriented therapy',
            explanation: 'May be helpful based on the kind of therapy support you selected.',
            reason: 'Selected in the therapy work-style preferences.',
        }))
        : [];
    const preferredConversationStyle = [
        supportive ? 'warm and validating' : 'honest and growth-oriented',
        directive ? 'gently structured' : 'collaborative and client-led',
        intensive ? 'comfortable with deeper emotions' : 'emotionally steady',
        past ? 'open to exploring deeper patterns' : 'present-focused',
    ];
    return {
        title: `${supportive ? 'Warm' : 'Growth-oriented'}, ${directive ? 'practical' : 'collaborative'} support${past ? ' with room for deeper understanding' : ' for what is happening now'}`,
        summary: `Based on your answers, you may benefit from a therapist who offers ${preferredConversationStyle.slice(0, 2).join(' and ')} support${mainConcerns.length ? ` while helping with ${mainConcerns.slice(0, 3).join(', ')}` : ''}.`,
        mainConcerns: mainConcerns.length ? mainConcerns : ['what has been feeling hardest lately'],
        preferredConversationStyle,
        recommendedModalities,
        whatToLookFor: ['A therapist who explains their approach clearly', 'A therapist who balances listening with practical guidance', 'A therapist who can connect emotions, patterns, and next steps'],
        consultationQuestions: ['How do you usually support clients with my main concerns?', 'What therapy approaches do you tend to use?', 'How do you balance emotional support with practical tools?', 'What does a first session with you usually feel like?'],
        preferredTraits: preferredConversationStyle,
        lessHelpfulTraits: [supportive ? 'Overly confrontational too early' : 'Only validating without helping you shift patterns'],
        userStyleVector: vector,
    };
}
export function generateMatches(body) {
    const userStyleVector = styleVector(body);
    return therapists
        .map((therapist) => {
        const areaCode = normalize(body.areaCode);
        const therapyTypes = stringList(body.therapyTypes);
        const insuranceProvider = normalize(body.insuranceProvider);
        const insurancePlan = normalize(body.insurancePlan);
        const carePreference = normalize(body.carePreference).toLowerCase();
        const preferredLanguage = normalize(body.preferredLanguage);
        const requiredLanguages = stringList(body.requiredLanguages);
        const preferredLanguages = stringList(body.preferredLanguages);
        const languagePriority = normalize(body.languagePriority) || 'preferred';
        const paymentPreference = normalize(body.paymentPreference);
        const culturalContextNeeds = stringList(body.culturalContextNeeds).filter((value) => value.toLowerCase() !== 'no strong preference');
        const modalityPreferenceIds = stringList(body.modalityPreferenceIds);
        const matchedTherapyTypes = overlap(therapist.therapyTypes, therapyTypes);
        const modelTargets = unique(modalityPreferenceIds.flatMap((id) => {
            if (id === 'toolsBased')
                return ['CBT', 'DBT', 'Solution-Focused'];
            if (id === 'insightBased')
                return ['Psychodynamic', 'Insight', 'Attachment'];
            if (id === 'traumaProcessing')
                return ['EMDR', 'Trauma', 'Somatic'];
            if (id === 'relationshipFocused')
                return ['IPT', 'Family Systems', 'EFT', 'Gottman'];
            if (id === 'valuesActionBased')
                return ['ACT', 'CBT', 'Behavioral Activation'];
            if (id === 'somaticRegulation')
                return ['Somatic', 'Mindfulness', 'DBT'];
            if (id === 'culturallyResponsive')
                return ['Culturally Responsive', 'Narrative', 'Family Systems'];
            if (id === 'neurodiversityAffirming')
                return ['Neurodiversity', 'ADHD', 'Autism', 'CBT', 'DBT'];
            return [];
        }));
        const therapistModelText = `${therapist.therapyModels.join(' ')} ${therapist.bio}`;
        const matchedTherapyModels = modelTargets.length > 0 ? modelTargets.filter((model) => textMatchesAny(therapistModelText, [model])) : overlap(therapist.therapyModels, therapyTypes);
        const matchingInsurance = therapist.insurance.filter((insurance) => {
            if (!insurance.acceptingNewPatients || !insuranceProvider)
                return false;
            if (insurance.provider.toLowerCase() !== insuranceProvider.toLowerCase())
                return false;
            if (!insurancePlan)
                return true;
            return (insurance.plan ?? '').toLowerCase() === insurancePlan.toLowerCase();
        });
        if (languagePriority === 'required' && requiredLanguages.length > 0 && !requiredLanguages.some((language) => therapist.languages.some((listed) => listed.toLowerCase() === language.toLowerCase() || (/mandarin|cantonese|chinese/i.test(language) && /mandarin|cantonese|chinese/i.test(listed))))) {
            return null;
        }
        if (paymentPreference === 'insurance' && insuranceProvider && matchingInsurance.length === 0) {
            return null;
        }
        const areaScore = areaCode && therapist.areaCodesServed.includes(areaCode) ? 100 : 45;
        const expertiseScore = therapyTypes.length === 0 ? 65 : Math.round((matchedTherapyTypes.length / therapyTypes.length) * 100);
        const languageTargets = [...requiredLanguages, ...preferredLanguages, preferredLanguage].filter(Boolean);
        const languageScore = languageTargets.length === 0 || languagePriority === 'flexible' ? 75 : languageTargets.some((target) => therapist.languages.some((language) => language.toLowerCase() === target.toLowerCase())) ? 100 : 45;
        const culturalLanguageFit = culturalContextNeeds.length === 0 ? round2(languageScore / 100) : round2((languageScore * 0.65 + (textMatchesAny(`${therapist.bio} ${therapist.therapyTypes.join(' ')}`, culturalContextNeeds) ? 100 : 40) * 0.35) / 100);
        const sessionFormatScore = !carePreference || carePreference === 'either'
            ? 85
            : carePreference === 'virtual'
                ? therapist.telehealthAvailable ? 100 : 30
                : therapist.inPersonAvailable ? 100 : 30;
        const insuranceScore = !insuranceProvider ? 60 : matchingInsurance.length > 0 ? 100 : 35;
        const cnipScore = 72;
        const therapyModelScore = modelTargets.length === 0 ? 65 : matchedTherapyModels.length > 0 ? 100 : 35;
        const practicalFitRaw = (languageScore * 0.3 + insuranceScore * 0.25 + sessionFormatScore * 0.2 + 75 * 0.15 + 75 * 0.1) / 100;
        const clinicalFitRaw = expertiseScore / 100;
        const modalityFitRaw = therapyModelScore / 100;
        const styleFitRaw = cnipScore / 100;
        const profileQualityTrust = 0.7;
        const finalScore = Math.round(100 * (0.3 * practicalFitRaw + 0.25 * clinicalFitRaw + 0.23 * modalityFitRaw + 0.12 * culturalLanguageFit + 0.07 * styleFitRaw + 0.03 * profileQualityTrust));
        const insuranceLabel = insurancePlan ? `${insuranceProvider} ${insurancePlan}` : insuranceProvider;
        const practicalFit = round2(practicalFitRaw);
        const clinicalFit = round2(clinicalFitRaw);
        const modalityFit = round2(modalityFitRaw);
        const adjustedStyleFit = round2(cnipScore / 100);
        return {
            id: `match-${normalize(body.userId) || 'anonymous'}-${therapist.id}-${Date.now()}`,
            userId: normalize(body.userId) || 'anonymous',
            therapistId: therapist.id,
            therapist: publicTherapist(therapist),
            hard_constraints_pass: areaScore === 100 && matchedTherapyTypes.length > 0 && (!insuranceProvider || matchingInsurance.length > 0),
            hard_constraint_reasons: [
                areaScore === 100 ? `Serves ZIP code ${areaCode}.` : `Closest available ZIP coverage: ${therapist.areaCodesServed.slice(0, 3).join(', ')}.`,
                matchedTherapyTypes.length > 0 ? `Supports ${matchedTherapyTypes.slice(0, 3).join(', ')}.` : `Related profile focus: ${therapist.therapyTypes.slice(0, 3).join(', ')}.`,
                matchingInsurance.length > 0 ? `Accepts ${insuranceLabel}.` : insuranceProvider ? `Insurance with ${insuranceLabel} needs confirmation.` : 'Insurance not provided; confirm coverage with therapist.',
            ],
            preference_score: finalScore,
            cnip_score: cnipScore,
            therapy_model_score: therapyModelScore,
            final_score: finalScore,
            scoreBreakdown: {
                practicalFit,
                clinicalFit,
                modalityFit,
                adjustedStyleFit,
                culturalLanguageFit,
                profileQualityTrust,
            },
            styleVector: userStyleVector,
            styleConfidence: 0.45,
            userFacingExplanation: {
                headline: 'Why this therapist may fit you',
                bullets: [
                    sessionFormatScore >= 85 ? 'Offers a compatible session format.' : 'Session format should be confirmed before booking.',
                    matchedTherapyTypes.length > 0 ? `Works with concerns related to ${matchedTherapyTypes.slice(0, 3).join(', ')}.` : 'Has a profile that may still be worth reviewing, though concern overlap is limited.',
                    matchedTherapyModels.length > 0 ? `Offers therapy approaches that match your profile, including ${matchedTherapyModels.slice(0, 3).join(', ')}.` : 'Therapy approach fit is worth confirming in consultation.',
                    'Their profile gives some clues about communication style, but this should be confirmed in a consultation.',
                ],
                confidenceNote: 'Their profile gives some clues about communication style, but this should be confirmed in a consultation.',
            },
            explanation: {
                tokens: [
                    'Production match generated from Vercel API.',
                    matchedTherapyTypes.length > 0 ? `Matched ${matchedTherapyTypes.length} therapy focus${matchedTherapyTypes.length === 1 ? '' : 'es'}.` : 'Best available partial match; confirm details before booking.',
                    `Language fit: ${languageScore}.`,
                    `Session format fit: ${sessionFormatScore}.`,
                ],
                matchedTherapyTypes: matchedTherapyTypes.length > 0 ? matchedTherapyTypes : therapist.therapyTypes.slice(0, 3),
                matchedTherapyModels: matchedTherapyModels.length > 0 ? matchedTherapyModels : therapist.therapyModels.slice(0, 3),
                matchingInsurance,
                scoreBreakdown: {
                    expertise: expertiseScore,
                    therapyModel: therapyModelScore,
                    language: languageScore,
                    sessionFormat: sessionFormatScore,
                    cnipStyle: cnipScore,
                },
            },
            ranked_at: new Date().toISOString(),
        };
    })
        .filter((match) => match !== null)
        .sort((a, b) => b.final_score - a.final_score || a.therapist.fullName.localeCompare(b.therapist.fullName));
}
