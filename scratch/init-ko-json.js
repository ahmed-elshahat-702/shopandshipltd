const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../messages/en.json');
const koPath = path.join(__dirname, '../messages/ko.json');

const fileContent = fs.readFileSync(enPath, 'utf8');
const data = JSON.parse(fileContent);

// Add/modify Korean keys
if (!data.common) data.common = {};
data.common.korean = '한국어';

if (!data.admin) data.admin = {};
data.admin.titleKo = '제목 (한국어)';
data.admin.subtitleKo = '부제목 (한국어)';
data.admin.descriptionKo = '설명 (한국어)';

fs.writeFileSync(koPath, JSON.stringify(data, null, 2), 'utf8');
console.log('Initialized ko.json successfully by copying en.json.');
