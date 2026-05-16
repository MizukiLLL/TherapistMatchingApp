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
function stringList(value) {
    return Array.isArray(value) ? value.map(String).map((entry) => entry.trim()).filter(Boolean) : [];
}
function overlap(left, right) {
    const rightSet = new Set(right.map((value) => value.toLowerCase()));
    return left.filter((value) => rightSet.has(value.toLowerCase()));
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
    return {
        title: `${supportive ? 'Warm' : 'Growth-oriented'}, ${directive ? 'structured' : 'collaborative'}, and ${intensive ? 'emotionally attuned' : 'steady'}`,
        summary: `Your preferences suggest you may work best with a therapist who ${supportive ? 'helps you feel understood' : 'can be honest and growth-focused'} while also ${directive ? 'offering clear direction and next steps' : 'letting the pace feel collaborative'}.`,
        preferredTraits: [
            supportive ? 'Supportive and validating' : 'Honest and growth-focused',
            directive ? 'Gently directive' : 'Collaborative and client-led',
            intensive ? 'Comfortable with deeper emotions' : 'Emotionally steady',
            past ? 'Open to exploring deeper patterns' : 'Present-focused and practical',
        ],
        lessHelpfulTraits: [
            supportive ? 'Overly confrontational too early' : 'Only validating without helping you shift patterns',
            directive ? 'Too open-ended without structure' : 'Too directive before trust is built',
            intensive ? 'Staying only on surface-level tips' : 'Diving too deeply too fast',
        ],
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
        const matchedTherapyTypes = overlap(therapist.therapyTypes, therapyTypes);
        const matchedTherapyModels = overlap(therapist.therapyModels, therapyTypes);
        const matchingInsurance = therapist.insurance.filter((insurance) => {
            if (!insurance.acceptingNewPatients || !insuranceProvider)
                return false;
            if (insurance.provider.toLowerCase() !== insuranceProvider.toLowerCase())
                return false;
            if (!insurancePlan)
                return true;
            return (insurance.plan ?? '').toLowerCase() === insurancePlan.toLowerCase();
        });
        const areaScore = areaCode && therapist.areaCodesServed.includes(areaCode) ? 100 : 45;
        const expertiseScore = therapyTypes.length === 0 ? 65 : Math.round((matchedTherapyTypes.length / therapyTypes.length) * 100);
        const languageScore = !preferredLanguage || therapist.languages.some((language) => language.toLowerCase() === preferredLanguage.toLowerCase()) ? 100 : 70;
        const sessionFormatScore = !carePreference || carePreference === 'either'
            ? 85
            : carePreference === 'virtual'
                ? therapist.telehealthAvailable ? 100 : 30
                : therapist.inPersonAvailable ? 100 : 30;
        const insuranceScore = !insuranceProvider ? 60 : matchingInsurance.length > 0 ? 100 : 35;
        const cnipScore = 72;
        const therapyModelScore = matchedTherapyModels.length > 0 ? 100 : 60;
        const finalScore = Math.round(expertiseScore * 0.32 + languageScore * 0.14 + sessionFormatScore * 0.14 + areaScore * 0.14 + insuranceScore * 0.1 + cnipScore * 0.1 + therapyModelScore * 0.06);
        const insuranceLabel = insurancePlan ? `${insuranceProvider} ${insurancePlan}` : insuranceProvider;
        const practicalFit = round2((languageScore * 0.3 + insuranceScore * 0.25 + sessionFormatScore * 0.2 + 75 * 0.15 + 75 * 0.1) / 100);
        const clinicalFit = round2(expertiseScore / 100);
        const adjustedStyleFit = round2(cnipScore / 100);
        const culturalLanguageFit = round2(languageScore / 100);
        const profileQualityTrust = 0.7;
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
        .sort((a, b) => b.final_score - a.final_score || a.therapist.fullName.localeCompare(b.therapist.fullName));
}
