const fs = require('fs');
const path = require('path');

class SparseMatrix {
    constructor(matrixFilePath = null, numRows = 0, numCols = 0) {
        this.rows = numRows;
        this.cols = numCols;
        this.values = [];
        this.col_indices = [];
        this.row_ptr = numRows > 0 ? Array(numRows + 1).fill(0) : [0];
        
        if (matrixFilePath) {
            this.loadFromFile(matrixFilePath);
        }
    }

    loadFromFile(filePath) {
        try {
            const absolutePath = path.resolve(filePath);
            if (!fs.existsSync(absolutePath)) {
                throw new Error(`File not found: ${absolutePath}`);
            }

            const content = fs.readFileSync(absolutePath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim() !== '');

            if (lines.length < 2) {
                throw new Error("File must contain at least rows and cols definitions");
            }

            const rowsMatch = lines[0].match(/rows=(\d+)/i);
            const colsMatch = lines[1].match(/cols=(\d+)/i);
            
            if (!rowsMatch || !colsMatch) {
                throw new Error("Invalid rows/cols format. Expected 'rows=N' and 'cols=M'");
            }

            this.rows = parseInt(rowsMatch[1]);
            this.cols = parseInt(colsMatch[1]);

            if (this.rows <= 0 || this.cols <= 0) {
                throw new Error("Matrix dimensions must be positive integers");
            }

            this.row_ptr = Array(this.rows + 1).fill(0);
            
            const entries = [];
            for (let i = 2; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!(line.startsWith("(") && line.endsWith(")"))) {
                    throw new Error(`Line ${i+1}: Entries must be in format (row,col,value)`);
                }

                const content = line.slice(1, -1).replace(/\s/g, '');
                const parts = content.split(',');
                
                if (parts.length !== 3) {
                    throw new Error(`Line ${i+1}: Expected exactly 3 values (row,col,value)`);
                }

                const row = parseInt(parts[0]);
                let col = parseInt(parts[1]);
                const value = parseInt(parts[2]);

                if (isNaN(row) || isNaN(col) || isNaN(value)) {
                    throw new Error(`Line ${i+1}: All values must be integers`);
                }

                if (row < 0 || col < 0) {
                    throw new Error(`Line ${i+1}: Row and column indices must be non-negative`);
                }

                if (col === this.cols) {
                    col = this.cols - 1;
                }

                if (row >= this.rows || col >= this.cols) {
                    throw new Error(`Line ${i+1}: Index out of bounds (row=${row}, col=${col}) for dimensions rows=${this.rows}, cols=${this.cols}`);
                }

                entries.push([row, col, value]);
            }

            // Sort entries by row, then column
            entries.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

            // Populate CSR arrays
            for (const [row, col, value] of entries) {
                this.setElement(row, col, value);
            }
        } catch (error) {
            throw new Error(`Error in ${path.basename(filePath)}: ${error.message}`);
        }
    }

    getElement(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            throw new Error("Indices out of bounds");
        }

        const start = this.row_ptr[row];
        const end = row + 1 < this.row_ptr.length ? this.row_ptr[row + 1] : this.values.length;

        for (let i = start; i < end; i++) {
            if (this.col_indices[i] === col) {
                return this.values[i];
            }
        }
        return 0;
    }

    setElement(row, col, value) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            throw new Error("Indices out of bounds");
        }

        while (this.row_ptr.length <= row + 1) {
            this.row_ptr.push(this.row_ptr[this.row_ptr.length - 1]);
        }

        const start = this.row_ptr[row];
        const end = this.row_ptr[row + 1];

        let pos = start;
        while (pos < end && this.col_indices[pos] < col) {
            pos++;
        }

        if (pos < end && this.col_indices[pos] === col) {
            if (value === 0) {
                this.values.splice(pos, 1);
                this.col_indices.splice(pos, 1);
                for (let i = row + 1; i < this.row_ptr.length; i++) {
                    this.row_ptr[i]--;
                }
            } else {
                this.values[pos] = value;
            }
        } else if (value !== 0) {
            this.values.splice(pos, 0, value);
            this.col_indices.splice(pos, 0, col);
            for (let i = row + 1; i < this.row_ptr.length; i++) {
                this.row_ptr[i]++;
            }
        }
    }

    add(other) {
        if (this.rows !== other.rows || this.cols !== other.cols) {
            throw new Error("Matrix dimensions must match for addition");
        }

        const result = new SparseMatrix(null, this.rows, this.cols);

        for (let i = 0; i < this.rows; i++) {
            const selfStart = this.row_ptr[i];
            const selfEnd = i + 1 < this.row_ptr.length ? this.row_ptr[i + 1] : this.values.length;
            const otherStart = other.row_ptr[i];
            const otherEnd = i + 1 < other.row_ptr.length ? other.row_ptr[i + 1] : other.values.length;

            let p1 = selfStart;
            let p2 = otherStart;

            while (p1 < selfEnd && p2 < otherEnd) {
                const col1 = this.col_indices[p1];
                const col2 = other.col_indices[p2];

                if (col1 < col2) {
                    result.setElement(i, col1, this.values[p1]);
                    p1++;
                } else if (col2 < col1) {
                    result.setElement(i, col2, other.values[p2]);
                    p2++;
                } else {
                    const sumVal = this.values[p1] + other.values[p2];
                    if (sumVal !== 0) {
                        result.setElement(i, col1, sumVal);
                    }
                    p1++;
                    p2++;
                }
            }

            while (p1 < selfEnd) {
                result.setElement(i, this.col_indices[p1], this.values[p1]);
                p1++;
            }
            while (p2 < otherEnd) {
                result.setElement(i, other.col_indices[p2], other.values[p2]);
                p2++;
            }
        }

        return result;
    }

    subtract(other) {
        if (this.rows !== other.rows || this.cols !== other.cols) {
            throw new Error("Matrix dimensions must match for subtraction");
        }

        const result = new SparseMatrix(null, this.rows, this.cols);

        for (let i = 0; i < this.rows; i++) {
            const selfStart = this.row_ptr[i];
            const selfEnd = i + 1 < this.row_ptr.length ? this.row_ptr[i + 1] : this.values.length;
            const otherStart = other.row_ptr[i];
            const otherEnd = i + 1 < other.row_ptr.length ? other.row_ptr[i + 1] : other.values.length;

            let p1 = selfStart;
            let p2 = otherStart;

            while (p1 < selfEnd && p2 < otherEnd) {
                const col1 = this.col_indices[p1];
                const col2 = other.col_indices[p2];

                if (col1 < col2) {
                    result.setElement(i, col1, this.values[p1]);
                    p1++;
                } else if (col2 < col1) {
                    result.setElement(i, col2, -other.values[p2]);
                    p2++;
                } else {
                    const diffVal = this.values[p1] - other.values[p2];
                    if (diffVal !== 0) {
                        result.setElement(i, col1, diffVal);
                    }
                    p1++;
                    p2++;
                }
            }

            while (p1 < selfEnd) {
                result.setElement(i, this.col_indices[p1], this.values[p1]);
                p1++;
            }
            while (p2 < otherEnd) {
                result.setElement(i, other.col_indices[p2], -other.values[p2]);
                p2++;
            }
        }

        return result;
    }

    multiply(other) {
        if (this.cols !== other.rows) {
            throw new Error("Columns of first matrix must match rows of second matrix");
        }

        const result = new SparseMatrix(null, this.rows, other.cols);
        const tempRow = Array(other.cols).fill(0);

        for (let i = 0; i < this.rows; i++) {
            // Reset temporary row
            for (let j = 0; j < other.cols; j++) {
                tempRow[j] = 0;
            }

            const selfStart = this.row_ptr[i];
            const selfEnd = i + 1 < this.row_ptr.length ? this.row_ptr[i + 1] : this.values.length;

            for (let p1 = selfStart; p1 < selfEnd; p1++) {
                const rowVal = this.values[p1];
                const colInSelf = this.col_indices[p1];

                const otherStart = other.row_ptr[colInSelf];
                const otherEnd = colInSelf + 1 < other.row_ptr.length ? other.row_ptr[colInSelf + 1] : other.values.length;

                for (let p2 = otherStart; p2 < otherEnd; p2++) {
                    const product = rowVal * other.values[p2];
                    const resultCol = other.col_indices[p2];
                    tempRow[resultCol] += product;
                }
            }

            // Collect non-zero elements
            const nonZeroEntries = [];
            for (let j = 0; j < other.cols; j++) {
                if (tempRow[j] !== 0) {
                    nonZeroEntries.push([j, tempRow[j]]);
                }
            }

            // Sort by column index
            nonZeroEntries.sort((a, b) => a[0] - b[0]);

            // Append to CSR structure
            for (const [col, value] of nonZeroEntries) {
                result.values.push(value);
                result.col_indices.push(col);
            }
            result.row_ptr[i + 1] = result.row_ptr[i] + nonZeroEntries.length;

            // Update subsequent row_ptr entries
            for (let k = i + 2; k < result.row_ptr.length; k++) {
                result.row_ptr[k] = result.row_ptr[i + 1];
            }
        }

        return result;
    }

    saveToFile(filePath) {
        try {
            const absolutePath = path.resolve(filePath);
            const dir = path.dirname(absolutePath);

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            let output = `rows=${this.rows}\ncols=${this.cols}\n`;

            for (let i = 0; i < this.rows; i++) {
                const start = this.row_ptr[i];
                const end = i + 1 < this.row_ptr.length ? this.row_ptr[i + 1] : this.values.length;
                for (let j = start; j < end; j++) {
                    output += `(${i}, ${this.col_indices[j]}, ${this.values[j]})\n`;
                }
            }

            fs.writeFileSync(absolutePath, output);
        } catch (error) {
            throw new Error(`Error saving to file: ${error.message}`);
        }
    }
}

module.exports = SparseMatrix;