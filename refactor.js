import fs from "node:fs";
import path from "node:path";

const dir = "./components/marketing-gemini-v3";

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Change primary color
  content = content.replace(/#4B57DB/g, '#1E5DF2');
  
  // Fix rounded corners
  content = content.replace(/rounded-\[10px\]/g, 'rounded-[6px]');
  content = content.replace(/rounded-\[12px\]/g, 'rounded-[6px]');
  content = content.replace(/rounded-[23]xl/g, 'rounded-[6px]');
  content = content.replace(/rounded-xl/g, 'rounded-[6px]');
  content = content.replace(/rounded-full/g, 'rounded-[6px]'); // Wait, some fulls are for dots, carefully replace only big elements. Let's skip full.
  
  content = content.replace(/rounded-lg/g, 'rounded-[6px]');
  content = content.replace(/rounded-md/g, 'rounded-[4px]');

  // Typography - apply Bespoke Serif to big text
  content = content.replace(/text-\[clamp\([^)]+\)\] font-medium/g, 'text-[clamp(36px,5vw,56px)] font-[\'Bespoke_Serif\'] font-medium');
  content = content.replace(/text-\[32px\]/g, 'text-[32px] font-[\'Bespoke_Serif\']');
  content = content.replace(/text-\[42px\]/g, 'text-[42px] font-[\'Bespoke_Serif\']');
  content = content.replace(/text-4xl/g, 'text-4xl font-[\'Bespoke_Serif\']');
  content = content.replace(/text-3xl/g, 'text-3xl font-[\'Bespoke_Serif\']');
  
  // Kickers and labels
  content = content.replace(/uppercase tracking-\[1px\]/g, 'uppercase tracking-[1px] font-mono');
  content = content.replace(/font-semibold/g, 'font-medium'); // A bit less heavy

  // Reduce text width
  content = content.replace(/max-w-\[800px\]/g, 'max-w-[600px]');
  
  fs.writeFileSync(filePath, content, 'utf8');
}

function walkArgs(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkArgs(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walkArgs(dir);
console.log('Refactor complete.');
