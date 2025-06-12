const SparseMatrix = require('./sparseMatrix');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function prompt(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function getValidFilePath(promptText) {
    while (true) {
        const filePath = await prompt(promptText);
        const absolutePath = path.resolve(filePath);
        
        if (!fs.existsSync(absolutePath)) {
            console.log(`File not found: ${absolutePath}`);
            console.log("Please provide a valid path (e.g., C:\\path\\to\\file.txt or relative to current directory)");
            continue;
        }
        
        return absolutePath;
    }
}

async function main() {
    console.log("Sparse Matrix-CSR Operations");
    console.log("=".repeat(40));
    
    const outputsDir = path.join(process.cwd(), 'outputs');
    if (!fs.existsSync(outputsDir)) {
        fs.mkdirSync(outputsDir, { recursive: true });
    }
    
    while (true) {
        console.log("\nMenu:");
        console.log("1. Add matrices");
        console.log("2. Subtract matrices");
        console.log("3. Multiply matrices");
        console.log("4. Exit");
        
        const choice = await prompt("Enter your choice (1-4): ");
        
        if (choice === '4') {
            console.log("Exiting program.");
            break;
        }
        
        if (!['1', '2', '3'].includes(choice)) {
            console.log("Invalid choice. Please enter 1-4.");
            continue;
        }
        
        try {
            console.log("\nFirst matrix:");
            const file1 = await getValidFilePath("Enter path to first matrix file: ");
            
            console.log("\nSecond matrix:");
            const file2 = await getValidFilePath("Enter path to second matrix file: ");
            
            let outputFilename = await prompt("\nEnter output file name (without path): ");
            if (!outputFilename) {
                console.log("Output file name cannot be empty");
                continue;
            }
            
            const outputPath = path.join(outputsDir, outputFilename);
            
            const matrix1 = new SparseMatrix(file1);
            const matrix2 = new SparseMatrix(file2);
            
            let result;
            let operation;
            
            switch (choice) {
                case '1':
                    result = matrix1.add(matrix2);
                    operation = "addition";
                    break;
                case '2':
                    result = matrix1.subtract(matrix2);
                    operation = "subtraction";
                    break;
                case '3':
                    result = matrix1.multiply(matrix2);
                    operation = "multiplication";
                    break;
            }
            
            result.saveToFile(outputPath);
            console.log(`\nMatrix ${operation} completed successfully!`);
            console.log(`Result saved to: ${outputPath}`);
            
        } catch (error) {
            console.log(`\nError: ${error.message}`);
            console.log("Please try again with valid inputs.");
        }
    }
    
    rl.close();
}

main();