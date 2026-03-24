/**
 * 富足診所 - 電子病歷系統 v3
 * Google Apps Script 後端（含統計功能）
 */

const FOLDER_NAME_PDF = '電子病歷_初診單';
const FOLDER_NAME_JSON = '電子病歷_初診單_JSON';
const SPREADSHEET_ID = '1r7wCEUkgGCjfucpZCJ2zMUhb4oUogYuPcOcV7rAfNEg';

/**
 * 處理 POST 請求
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const pdfFolder = getOrCreateFolder(FOLDER_NAME_PDF);
    const jsonFolder = getOrCreateFolder(FOLDER_NAME_JSON);
    
    // 檔案命名：病歷號_姓名
    const fileName = `${data.medicalRecordNumber || '無病歷號'}_${data.name}`;
    
    // 儲存 JSON 到 JSON 資料夾
    jsonFolder.createFile(fileName + '.json', JSON.stringify(data, null, 2), 'application/json');
    
    // 產生並儲存 PDF 到 PDF 資料夾
    const pdfBlob = createSimplePDF(data);
    pdfFolder.createFile(pdfBlob.setName(fileName + '.pdf'));
    
    // 寫入 Google Sheets 統計
    writeToSheet(data);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: '儲存成功',
      fileName: fileName
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 處理 GET 請求（測試用）
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: '富足診所電子病歷系統 v3（含統計）'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 寫入 Google Sheets
 */
function writeToSheet(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('初診資料');
  
  // 如果工作表不存在，建立並加標題
  if (!sheet) {
    sheet = ss.insertSheet('初診資料');
    sheet.appendRow([
      '病歷號碼', '填表日期', '姓名', '性別', '出生日期', '身分證字號',
      '手機', '地址', '緊急聯絡人', 
      'Facebook', 'IG', '診所網站', '親友介紹', 'Google搜尋',
      '介紹人', '建檔時間'
    ]);
    // 設定標題列格式
    sheet.getRange(1, 1, 1, 16).setFontWeight('bold').setBackground('#4a7c59').setFontColor('white');
    sheet.setFrozenRows(1);
  }
  
  // 解析來源
  const sources = data.sourceChannels || {};
  
  // 新增一列資料
  sheet.appendRow([
    data.medicalRecordNumber || '',
    data.fillDate || '',
    data.name || '',
    data.gender === 'male' ? '男' : (data.gender === 'female' ? '女' : (data.gender || '')),
    `${data.birthYear || ''}/${data.birthMonth || ''}/${data.birthDay || ''}`,
    data.idNumber || '',
    data.mobilePhone || '',
    data.address || '',
    data.emergencyContact || '',
    sources.facebook ? '✓' : '',
    sources.ig ? '✓' : '',
    sources.website ? '✓' : '',
    sources.friendRefer ? '✓' : '',
    sources.google ? '✓' : '',
    data.referrerName || '',
    new Date().toLocaleString('zh-TW', {timeZone: 'Asia/Taipei'})
  ]);
}

/**
 * 初始化統計工作表（手動執行一次）
 */
function initStatsSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 建立統計工作表
  let statsSheet = ss.getSheetByName('來源統計');
  if (!statsSheet) {
    statsSheet = ss.insertSheet('來源統計');
  }
  
  // 設定統計公式
  statsSheet.getRange('A1').setValue('來源統計');
  statsSheet.getRange('A3').setValue('Facebook');
  statsSheet.getRange('A4').setValue('IG');
  statsSheet.getRange('A5').setValue('診所網站');
  statsSheet.getRange('A6').setValue('親友介紹');
  statsSheet.getRange('A7').setValue('Google搜尋');
  statsSheet.getRange('A9').setValue('總人數');
  
  statsSheet.getRange('B2').setValue('人數');
  statsSheet.getRange('B3').setFormula('=COUNTIF(\'初診資料\'!J:J,"✓")');
  statsSheet.getRange('B4').setFormula('=COUNTIF(\'初診資料\'!K:K,"✓")');
  statsSheet.getRange('B5').setFormula('=COUNTIF(\'初診資料\'!L:L,"✓")');
  statsSheet.getRange('B6').setFormula('=COUNTIF(\'初診資料\'!M:M,"✓")');
  statsSheet.getRange('B7').setFormula('=COUNTIF(\'初診資料\'!N:N,"✓")');
  statsSheet.getRange('B9').setFormula('=COUNTA(\'初診資料\'!C:C)-1');
  
  // 格式化
  statsSheet.getRange('A1').setFontSize(16).setFontWeight('bold');
  statsSheet.getRange('A3:A7').setBackground('#f0f0f0');
  statsSheet.getRange('B3:B7').setBackground('#e8f5e9');
  
  Logger.log('統計工作表已建立！');
}

/**
 * 取得或建立資料夾
 */
function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

/**
 * 取得今天日期字串
 */
function getTodayString() {
  const today = new Date();
  const year = today.getFullYear() - 1911;
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 產生 PDF（表格排版）
 */
function createSimplePDF(data) {
  const doc = DocumentApp.create('temp_初診單_' + new Date().getTime());
  const body = doc.getBody();

  body.setMarginTop(0);
  body.setMarginBottom(28);
  body.setMarginLeft(40);
  body.setMarginRight(40);

  const LABEL_BG = '#e8e8e8';
  const HEADER_BG = '#1a5a3e';
  const FONT_SIZE = 10;

  // ===== 標題（綠底白字）=====
  const headerTable = body.appendTable();
  var headerRow = headerTable.appendTableRow();
  var headerCell = headerRow.appendTableCell();
  headerCell.setBackgroundColor('#1a5a3e');
  headerCell.setPaddingTop(6);
  headerCell.setPaddingBottom(6);
  headerCell.setPaddingLeft(10);

  // Logo
  try {
    var logoFiles = DriveApp.getFilesByName('富足LOGO.png');
    if (logoFiles.hasNext()) {
      var logoBlob = logoFiles.next().getBlob();
      var logoImg = headerCell.appendImage(logoBlob);
      logoImg.setWidth(36);
      logoImg.setHeight(36);
    }
  } catch(e) {}

  var titlePara = headerCell.appendParagraph('富足診所 GoodLeg Clinic');
  titlePara.setFontSize(14);
  titlePara.setBold(true);
  titlePara.setForegroundColor('#ffffff');
  titlePara.setSpacingBefore(0);
  titlePara.setSpacingAfter(0);

  var subtitlePara = headerCell.appendParagraph('初診基本資料表 New Patient Registration Form');
  subtitlePara.setFontSize(10);
  subtitlePara.setBold(true);
  subtitlePara.setForegroundColor('#c8e6c9');

  // ===== 基本資料（2欄表格）=====
  const s1 = body.appendParagraph('基本資料 Basic Information');
  s1.setFontSize(12);
  s1.setBold(true);
  s1.setForegroundColor('#1a5a3e');
  s1.setSpacingBefore(10);
  s1.setSpacingAfter(6);

  // 解析性別
  let genderText = data.gender || '';
  if (genderText === 'male') genderText = '男 Male';
  else if (genderText === 'female') genderText = '女 Female';
  else if (genderText === '男') genderText = '男 Male';
  else if (genderText === '女') genderText = '女 Female';

  const t1 = body.appendTable();

  addRow2(t1, '病歷號碼 Record No.', data.medicalRecordNumber || '', LABEL_BG, FONT_SIZE);
  addRow2(t1, '填表日期 Date', data.fillDate || '', LABEL_BG, FONT_SIZE);
  addRow2(t1, '姓名 Name', data.name || '', LABEL_BG, FONT_SIZE);
  addRow2(t1, '性別 Gender', genderText, LABEL_BG, FONT_SIZE);
  addRow2(t1, '出生日期 DOB', '民國 ' + (data.birthYear || '') + ' 年 ' + (data.birthMonth || '') + ' 月 ' + (data.birthDay || '') + ' 日', LABEL_BG, FONT_SIZE);
  addRow2(t1, '身分證字號 ID No.', data.idNumber || '', LABEL_BG, FONT_SIZE);
  addRow2(t1, '電話（宅）Home', data.homePhone || '無 N/A', LABEL_BG, FONT_SIZE);
  addRow2(t1, '手機 Mobile', data.mobilePhone || '', LABEL_BG, FONT_SIZE);
  addRow2(t1, '聯絡地址 Address', data.address || '', LABEL_BG, FONT_SIZE);
  addRow2(t1, '緊急聯絡人 Emergency', data.emergencyContact || '', LABEL_BG, FONT_SIZE);
  addRow2(t1, '與病患關係 Relation', data.relationship || '', LABEL_BG, FONT_SIZE);
  addRow2(t1, '緊急電話 Emg. Phone', data.emergencyPhone || '', LABEL_BG, FONT_SIZE);
  addRow2(t1, '電子信箱 Email', data.email || '無 N/A', LABEL_BG, FONT_SIZE);

  // 得知訊息來源
  let sources = [];
  if (data.sourceChannels) {
    if (data.sourceChannels.facebook) sources.push('Facebook');
    if (data.sourceChannels.ig) sources.push('IG');
    if (data.sourceChannels.website) sources.push('診所網站 Website');
    if (data.sourceChannels.friendRefer) sources.push('親友介紹 Referral');
    if (data.sourceChannels.google) sources.push('Google搜尋 Search');
  }
  let sourceText = sources.length > 0 ? sources.join('、') : '無 N/A';
  if (data.referrerName) {
    sourceText += '（介紹人 Referrer：' + data.referrerName + '）';
  }
  addRow2(t1, '得知本院訊息 Source', sourceText, LABEL_BG, FONT_SIZE);

  body.appendParagraph('');

  // ===== 家族病史 =====
  const s2 = body.appendParagraph('家族病史 Family Medical History');
  s2.setFontSize(12);
  s2.setBold(true);
  s2.setForegroundColor('#1a5a3e');
  s2.setSpacingAfter(6);

  const desc = body.appendParagraph('直系血親是否曾罹患以下疾病？ Has any immediate family been diagnosed with the following?');
  desc.setFontSize(9);
  desc.setForegroundColor('#666666');
  desc.setSpacingAfter(6);

  const fh = data.familyHistory || {};

  const t2 = body.appendTable();
  // 標題列
  var headerRow = t2.appendTableRow();
  var h1 = headerRow.appendTableCell('疾病項目 Disease');
  h1.setBackgroundColor(HEADER_BG);
  h1.setFontSize(FONT_SIZE);
  h1.setBold(true);
  h1.setForegroundColor('#ffffff');
  h1.setPaddingTop(6);
  h1.setPaddingBottom(6);
  h1.setPaddingLeft(6);
  var h2 = headerRow.appendTableCell('勾選');
  h2.setBackgroundColor(HEADER_BG);
  h2.setFontSize(FONT_SIZE);
  h2.setBold(true);
  h2.setForegroundColor('#ffffff');
  h2.setPaddingTop(6);
  h2.setPaddingBottom(6);
  h2.setPaddingLeft(6);
  h2.setWidth(50);

  addHistoryRow(t2, '中風、心肌梗塞等心血管疾病 Cardiovascular', fh.cardiovascular, FONT_SIZE);
  addHistoryRow(t2, '高血壓、糖尿病、高血脂等代謝疾病 Metabolic', fh.metabolic, FONT_SIZE);
  addHistoryRow(t2, '癌症等惡性疾病 Cancer', fh.cancer, FONT_SIZE);
  addHistoryRow(t2, '其他（自體免疫疾病、重大傷病等）Other', fh.other, FONT_SIZE);

  if (data.familyHistoryOther) {
    var otherRow = t2.appendTableRow();
    var otherLabel = otherRow.appendTableCell('說明 Details');
    otherLabel.setBackgroundColor(LABEL_BG);
    otherLabel.setFontSize(FONT_SIZE);
    otherLabel.setBold(true);
    otherLabel.setPaddingTop(6);
    otherLabel.setPaddingBottom(6);
    otherLabel.setPaddingLeft(6);
    var otherVal = otherRow.appendTableCell(data.familyHistoryOther);
    otherVal.setFontSize(FONT_SIZE);
    otherVal.setPaddingTop(6);
    otherVal.setPaddingBottom(6);
    otherVal.setPaddingLeft(6);
  }

  // ===== 簽名 =====
  body.appendParagraph('');

  const s3 = body.appendParagraph('病人簽名 Patient Signature');
  s3.setFontSize(12);
  s3.setBold(true);
  s3.setForegroundColor('#1a5a3e');
  s3.setSpacingAfter(8);

  if (data.signature) {
    try {
      const signatureData = data.signature.replace(/^data:image\/\w+;base64,/, '');
      const signatureBlob = Utilities.newBlob(Utilities.base64Decode(signatureData), 'image/png', 'signature.png');
      const img = body.appendImage(signatureBlob);
      img.setWidth(250);
      img.setHeight(100);
    } catch (e) {
      body.appendParagraph('（簽名圖片載入失敗 Signature failed to load）');
    }
  } else {
    body.appendParagraph('（未簽名 No signature）');
  }

  body.appendParagraph('');
  const dateLine = body.appendParagraph('填表日期 Date：' + (data.fillDate || getTodayString()));
  dateLine.setFontSize(FONT_SIZE);
  dateLine.setForegroundColor('#666666');

  // 儲存並轉換為 PDF
  doc.saveAndClose();
  const pdfBlob = DriveApp.getFileById(doc.getId()).getAs('application/pdf');
  DriveApp.getFileById(doc.getId()).setTrashed(true);

  return pdfBlob;
}

/**
 * 新增 2 欄表格列（標籤 | 值）
 */
function addRow2(table, label, value, labelBg, fontSize) {
  var row = table.appendTableRow();
  var c1 = row.appendTableCell(label);
  c1.setBackgroundColor(labelBg);
  c1.setFontSize(fontSize);
  c1.setBold(true);
  c1.setPaddingTop(5);
  c1.setPaddingBottom(5);
  c1.setPaddingLeft(8);
  var c2 = row.appendTableCell(value);
  c2.setFontSize(fontSize);
  c2.setPaddingTop(5);
  c2.setPaddingBottom(5);
  c2.setPaddingLeft(8);
  return row;
}

/**
 * 新增家族病史列
 */
function addHistoryRow(table, label, checked, fontSize) {
  var row = table.appendTableRow();
  var c1 = row.appendTableCell(label);
  c1.setFontSize(fontSize);
  c1.setForegroundColor('#333333');
  c1.setPaddingTop(6);
  c1.setPaddingBottom(6);
  c1.setPaddingLeft(6);
  var c2 = row.appendTableCell(checked ? '☑' : '☐');
  c2.setFontSize(14);
  c2.setForegroundColor(checked ? '#1a5a3e' : '#999999');
  c2.setPaddingTop(6);
  c2.setPaddingBottom(6);
  c2.setPaddingLeft(6);
  if (checked) {
    c2.setForegroundColor('#1a5a3e');
    c2.setBold(true);
  }
  return row;
}

/**
 * 測試函數
 */
function testCreatePDF() {
  const testData = {
    name: '測試病人',
    gender: '男',
    birthYear: '80',
    birthMonth: '5',
    birthDay: '15',
    idNumber: 'A123456789',
    mobilePhone: '0912345678',
    address: '台中市西屯區市政路123號',
    emergencyContact: '測試聯絡人',
    relationship: '配偶',
    emergencyPhone: '0987654321',
    sourceChannels: {
      facebook: true,
      ig: false,
      website: true,
      friendRefer: false,
      google: true
    },
    familyHistory: {
      cardiovascular: true,
      metabolic: false,
      cancer: false,
      other: false
    },
    fillDate: '114/02/13'
  };
  
  const pdfFolder = getOrCreateFolder(FOLDER_NAME_PDF);
  const pdfBlob = createSimplePDF(testData);
  const file = pdfFolder.createFile(pdfBlob.setName('測試_初診單.pdf'));
  Logger.log('測試 PDF 已建立：' + file.getUrl());
  
  // 也寫入 Sheets
  writeToSheet(testData);
  Logger.log('已寫入 Google Sheets');
}
