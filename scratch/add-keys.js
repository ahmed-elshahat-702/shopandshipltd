const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../messages/en.json');
const arPath = path.join(__dirname, '../messages/ar.json');

// Helper to update json
function updateJson(filePath, lang) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(fileContent);

  // Add common.korean
  if (!data.common) data.common = {};
  data.common.korean = lang === 'en' ? 'Korean' : 'الكورية';

  // Add admin keys
  if (!data.admin) data.admin = {};
  data.admin.titleKo = lang === 'en' ? 'Title (Korean)' : 'العنوان (الكورية)';
  data.admin.subtitleKo = lang === 'en' ? 'Subtitle (Korean)' : 'العنوان الفرعي (الكورية)';
  data.admin.descriptionKo = lang === 'en' ? 'Description (Korean)' : 'الوصف (الكورية)';

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated ${filePath} successfully.`);
}

updateJson(enPath, 'en');
updateJson(arPath, 'ar');
