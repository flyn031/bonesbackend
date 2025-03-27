// debug-dashboard.ts
import fs from 'fs';

const dashboardControllerPath = './src/controllers/dashboardController.ts';

try {
  // Read the file content
  const content = fs.readFileSync(dashboardControllerPath, 'utf8');
  
  // Log the first 10 lines to check imports
  console.log('First 10 lines of dashboardController.ts:');
  console.log(content.split('\n').slice(0, 10).join('\n'));
  
  // Check for any references to CustomerHealthService
  if (content.includes('CustomerHealthService')) {
    console.log('\nFound references to CustomerHealthService:');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('CustomerHealthService')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
      }
    });
  } else {
    console.log('\nNo references to CustomerHealthService found in the file.');
  }
} catch (error) {
  console.error('Error reading file:', error);
}
