const fs = require('fs');
const path = 'c:\\Users\\johac\\OneDrive\\Desktop\\Carpetas varias\\SISFIN\\BACK-SISFIN\\src\\modules\\banking\\services\\bank-transaction.service.ts';
let content = fs.readFileSync(path, 'utf8');

// The offset logic starts around "if (saved.type === 'Ingreso' || saved.type === 'Cobro') {"
// Let's replace the whole GENERAR ASIENTO CONTABLE SI APLICA block.
const search = `      // GENERAR ASIENTO CONTABLE SI APLICA`;
const replace = `      // GENERAR ASIENTO CONTABLE SI APLICA
      let cashBasisAccountId = null;
      if (saved.details && saved.details.length > 0) {
        for (const detail of saved.details) {
          if (detail.sourceType === 'DOCUMENT' && detail.documentNumber) {
            const cleanDocNum = detail.documentNumber.replace(/^[^\\d]+/, '').trim();
            const document = await queryRunner.manager.createQueryBuilder(FinancialDocument, 'fd')
              .where('fd.documentNumber = :docNum', { docNum: cleanDocNum }).getOne();
            if (document) {
              const linesRes = await queryRunner.manager.query(\`SELECT data FROM financial_document_lines WHERE "documentId" = $1 LIMIT 1\`, [document.id]);
              if (linesRes && linesRes.length > 0 && linesRes[0].data && linesRes[0].data.accountId) cashBasisAccountId = linesRes[0].data.accountId;
            }
            const electronicDoc = await queryRunner.manager.createQueryBuilder(ElectronicDocumentRegistration, 'edr')
              .where('(edr.documentNumber = :docNum OR edr.documentLabel = :docNum)', { docNum: detail.documentNumber }).getOne();
            if (electronicDoc && electronicDoc.payableAccountId) cashBasisAccountId = electronicDoc.payableAccountId;
          }
        }
      }`;
content = content.replace(search, replace);

const search2 = `              // Intenta obtener la cuenta del detalle
              if (saved.details && saved.details.length === 1 && saved.details[0].accountName) {`;
const replace2 = `              if (cashBasisAccountId) {
                 offsetAccountId = cashBasisAccountId;
              }
              // Intenta obtener la cuenta del detalle
              else if (saved.details && saved.details.length === 1 && saved.details[0].accountName) {`;
content = content.replace(search2, replace2);

fs.writeFileSync(path, content);
console.log('Successfully updated bank-transaction.service.ts');
