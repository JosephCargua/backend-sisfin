const fs = require('fs');
const path = 'c:\\Users\\johac\\OneDrive\\Desktop\\Carpetas varias\\SISFIN\\BACK-SISFIN\\src\\modules\\banking\\services\\bank-transaction.service.ts';
let content = fs.readFileSync(path, 'utf8');

// Step 1: Initialize documentLinkedAccountId before the details loop
const search1 = `      // Actualizar amountPaid de los documentos y crear DocumentPayment
      if (saved.details && saved.details.length > 0) {
        for (const detail of saved.details) {`;
const replace1 = `      // Actualizar amountPaid de los documentos y crear DocumentPayment
      let documentLinkedAccountId = null;
      if (saved.details && saved.details.length > 0) {
        for (const detail of saved.details) {`;
content = content.replace(search1, replace1);

// Step 2: Extract account ID from document
const search2 = `            if (document) {
              const pending = Number(document.total) - Number(document.amountPaid);`;
const replace2 = `            if (document) {
              // Extract linked account for Cash Basis Accounting
              const linesRes = await queryRunner.manager.query(\`SELECT data FROM financial_document_lines WHERE "documentId" = $1 LIMIT 1\`, [document.id]);
              if (linesRes && linesRes.length > 0 && linesRes[0].data && linesRes[0].data.accountId) {
                  documentLinkedAccountId = linesRes[0].data.accountId;
              }

              const pending = Number(document.total) - Number(document.amountPaid);`;
content = content.replace(search2, replace2);

// Step 3: Extract account ID from electronicDoc
const search3 = `            if (electronicDoc) {
              const pending = Number(electronicDoc.total) - Number(electronicDoc.amountPaid);`;
const replace3 = `            if (electronicDoc) {
              if (electronicDoc.payableAccountId) {
                  documentLinkedAccountId = electronicDoc.payableAccountId;
              }

              const pending = Number(electronicDoc.total) - Number(electronicDoc.amountPaid);`;
content = content.replace(search3, replace3);

// Step 4: Use documentLinkedAccountId when creating the Journal Entry
const search4 = `           } else {
              // Intenta obtener la cuenta del detalle
              if (saved.details && saved.details.length === 1 && saved.details[0].accountName) {
                 const res = await queryRunner.manager.query(\`SELECT id FROM accounts WHERE name ILIKE $1 LIMIT 1\`, [\`%\${saved.details[0].accountName}%\`]);
                 if (res && res.length > 0) offsetAccountId = res[0].id;
              }`;
const replace4 = `           } else {
              // Cash-Basis Accounting: Try to get the account linked to the document first
              if (documentLinkedAccountId) {
                  offsetAccountId = documentLinkedAccountId;
              }
              // Intenta obtener la cuenta del detalle si no hay documento vinculado
              else if (saved.details && saved.details.length === 1 && saved.details[0].accountName) {
                 const res = await queryRunner.manager.query(\`SELECT id FROM accounts WHERE name ILIKE $1 LIMIT 1\`, [\`%\${saved.details[0].accountName}%\`]);
                 if (res && res.length > 0) offsetAccountId = res[0].id;
              }`;
content = content.replace(search4, replace4);

fs.writeFileSync(path, content);
console.log('Successfully updated bank-transaction.service.ts for Cash Basis accounting.');
