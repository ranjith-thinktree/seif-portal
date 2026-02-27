const fs = require('fs');
let content = fs.readFileSync('./src/api/v1/services/refurbishment.service.js', 'utf8');

const oldStr = `const requestNumber = requestData.request_number
        ? \`RQ-\${String(requestData.request_number).padStart(6, '0')}\`
        : \`REF-\${requestId.slice(0, 8).toUpperCase()}\`;`;

const newStr = `const requestNumber = requestData.request_number
        ? String(requestData.request_number).toUpperCase()
        : \`REF-\${requestId.slice(0, 8).toUpperCase()}\`;`;

const count = content.split(oldStr).length - 1;
console.log('Replacements:', count);
content = content.split(oldStr).join(newStr);
fs.writeFileSync('./src/api/v1/services/refurbishment.service.js', content);
console.log('Done');
