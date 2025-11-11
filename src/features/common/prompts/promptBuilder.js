const { profilePrompts } = require('./promptTemplates.js');
const { localizedPrompts } = require('./localizedPrompts.js');

async function buildSystemPrompt(promptParts, customPrompt = '', googleSearchEnabled = true, language = 'en') {
    const sections = [promptParts.intro, '\n\n', promptParts.formatRequirements];

    if (googleSearchEnabled) {
        sections.push('\n\n', promptParts.searchUsage);
    }

    sections.push('\n\n', promptParts.content, '\n\nUser-provided context\n-----\n', customPrompt, '\n-----\n\n', promptParts.outputInstructions);
    
    // Добавляем инструкцию о языке в конец промпта
    const languageInstruction = await getLanguageInstruction(language);
    sections.push('\n\n', languageInstruction);

    return sections.join('');
}

async function getLanguageInstruction(language) {
    // Резервный вариант для инструкций по языку
    const languageMap = {
        'en': 'Please respond in English language.',
        'ru': 'Пожалуйста, отвечайте на русском языке.',
        'es': 'Por favor, responda en español.',
        'fr': 'Veuillez répondre en français.',
        'de': 'Bitte antworten Sie auf Deutsch.',
        'ja': '日本語で回答してください。',
        'ko': '한국어로 답변해 주세요.',
        'zh': '请用中文回答。'
    };
    
    return languageMap[language] || languageMap['en'];
}

async function getSystemPrompt(profile, customPrompt = '', googleSearchEnabled = true, language = 'en') {
    // Попробуем сначала получить локализованные промпты для указанного языка
    if (localizedPrompts[language] && localizedPrompts[language][profile]) {
        const promptParts = localizedPrompts[language][profile];
        return await buildSystemPrompt(promptParts, customPrompt, googleSearchEnabled, language);
    }
    
    // Если для указанного языка нет промптов, используем английские промпты по умолчанию
    const promptParts = profilePrompts[profile] || profilePrompts.interview;
    return await buildSystemPrompt(promptParts, customPrompt, googleSearchEnabled, language);
}

module.exports = {
    getSystemPrompt,
};
