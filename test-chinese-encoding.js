import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

// 测试中文文件路径处理
const testChinesePath = 'f:\\ProgramPlace\\Company\\UC\\file-tool\\files_push\\测试文件_回复消息模板.txt';

console.log('测试中文文件路径处理:');
console.log('原始路径:', testChinesePath);

// 测试路径标准化
const normalizedPath = testChinesePath.replace(/\\/g, '/');
console.log('标准化路径:', normalizedPath);

// 测试文件存在性检查
if (fs.existsSync(testChinesePath)) {
  console.log('✓ 文件存在性检查通过');
  
  // 测试获取文件名
  const fileName = path.basename(normalizedPath);
  console.log('文件名:', fileName);
  
  // 测试ADB命令构建
  const deviceId = '31014575740020Z';
  const targetDir = '/sdcard/Android/data/com.tencent.uc/files/BattleRecord/';
  const targetPath = `${targetDir}/${fileName}`;
  
  console.log('目标路径:', targetPath);
  
  // 测试命令构建
  const mkdirCommand = `adb -s ${deviceId} shell mkdir -p "${targetDir}"`;
  const pushCommand = `adb -s ${deviceId} push "${normalizedPath}" "${targetPath}"`;
  
  console.log('创建目录命令:', mkdirCommand);
  console.log('推送文件命令:', pushCommand);
  
  // 执行测试命令
  console.log('\n执行测试命令...');
  exec(mkdirCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('创建目录失败:', error);
      return;
    }
    console.log('✓ 目录创建成功');
    
    exec(pushCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('文件推送失败:', error);
        console.error('错误信息:', stderr);
        return;
      }
      console.log('✓ 文件推送成功');
      console.log('输出:', stdout);
    });
  });
  
} else {
  console.error('✗ 文件不存在:', testChinesePath);
}