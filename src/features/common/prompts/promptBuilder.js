const { profilePrompts } = require('./promptTemplates.js');
const { localizedPrompts } = require('./localizedPrompts.js');

function buildSystemPrompt(promptParts, customPrompt = '', googleSearchEnabled = true) {
    const sections = [promptParts.intro, '\n\n', promptParts.formatRequirements];

    if (googleSearchEnabled) {
        sections.push('\n\n', promptParts.searchUsage);
    }

    sections.push('\n\n', promptParts.content, '\n\nUser-provided context\n-----\n', customPrompt, '\n-----\n\n', promptParts.outputInstructions);

    return sections.join('');
}

function getSystemPrompt(profile, customPrompt = '', googleSearchEnabled = true, language = 'en') {
    // Попробуем сначала получить локализованные промпты для указанного языка
    if (localizedPrompts[language] && localizedPrompts[language][profile]) {
        const promptParts = localizedPrompts[language][profile];
        return buildSystemPrompt(promptParts, customPrompt, googleSearchEnabled);
    }
    
    // Если для указанного языка нет промптов, используем английские промпты по умолчанию
    const promptParts = profilePrompts[profile] || profilePrompts.interview;
    return buildSystemPrompt(promptParts, customPrompt, googleSearchEnabled);
}

module.exports = {
    getSystemPrompt,
};
