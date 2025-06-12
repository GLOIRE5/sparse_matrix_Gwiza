This project implements memory-efficient and performant operations (Addition, Subtraction, and Multiplication) on large sparse matrices using JavaScript—without relying on built-in libraries. It's designed as part of a Data Structures and Algorithms coursework assignment.

Project Structure

/dsa/sparse\_matrix/
├── code/
│   └── src/
│       ├── main.js              # Entry point for user interaction
│       └── SparseMatrix.js      # Sparse matrix implementation
├── sample\_inputs/
│   ├── matrix1.txt              # Sample sparse matrix files
│   ├── matrix2.txt
│   ├── matrix3.txt
│   └── ....
└── README.md                    # Project documentation

Features
Load sparse matrices from file.
Memory-efficient matrix representation using object-based coordinate mapping.
Perform:
Addition
 Subtraction
✖️Multiplication
Input validation and error handling (e.g. format mismatch, size incompatibility).
Simple CLI-based user interface for selecting operations.
 Input File Format
Each matrix is stored in a .txt file with the following format:


rows=8433
cols=3180
(0, 381, -694)
(0, 128, -838)
(0, 639, 857)
...

First two lines define matrix dimensions.
Each subsequent line represents a non-zero entry: (row, col, value).
All unspecified entries are assumed to be 0.
 Getting Started
1. Clone the Repository
git clone <your-repo-url>
cd dsa/sparse_matrix/
2. File Setup
Make sure files are in the right place:

Source code: /code/src/
Matrix inputs: /sample_inputs/
3. Run the Program
cd code/src
node main.js
You’ll be prompted to select a matrix operation:

Select operation:
1 - Addition
2 - Subtraction
3 - Multiplication
Enter choice (1/2/3):


