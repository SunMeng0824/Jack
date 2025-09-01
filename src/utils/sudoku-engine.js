/**
 * 数独引擎 - 核心算法实现
 * 包含谜题生成、求解、验证等核心功能
 */
class SudokuEngine {
    constructor() {
        this.GRID_SIZE = 9;
        this.BOX_SIZE = 3;
        this.EMPTY_CELL = 0;
        
        // 难度配置
        this.DIFFICULTY_CONFIG = {
            easy: { filledCells: 35, name: '简单' },
            medium: { filledCells: 28, name: '中等' },
            hard: { filledCells: 22, name: '困难' }
        };
    }

    /**
     * 创建空的9x9网格
     */
    createEmptyGrid() {
        return Array(this.GRID_SIZE).fill(null).map(() => 
            Array(this.GRID_SIZE).fill(this.EMPTY_CELL)
        );
    }

    /**
     * 深拷贝网格
     */
    copyGrid(grid) {
        return grid.map(row => [...row]);
    }

    /**
     * 检查数字在指定位置是否有效
     * @param {Array} grid - 数独网格
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @param {number} num - 要检查的数字
     * @returns {boolean} 是否有效
     */
    isValidMove(grid, row, col, num) {
        // 检查行
        for (let x = 0; x < this.GRID_SIZE; x++) {
            if (grid[row][x] === num) {
                return false;
            }
        }

        // 检查列
        for (let x = 0; x < this.GRID_SIZE; x++) {
            if (grid[x][col] === num) {
                return false;
            }
        }

        // 检查3x3九宫格
        const startRow = Math.floor(row / this.BOX_SIZE) * this.BOX_SIZE;
        const startCol = Math.floor(col / this.BOX_SIZE) * this.BOX_SIZE;
        
        for (let i = 0; i < this.BOX_SIZE; i++) {
            for (let j = 0; j < this.BOX_SIZE; j++) {
                if (grid[startRow + i][startCol + j] === num) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 获取指定位置的所有可能数字
     * @param {Array} grid - 数独网格
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @returns {Array} 可能的数字数组
     */
    getPossibleNumbers(grid, row, col) {
        const possibilities = [];
        for (let num = 1; num <= this.GRID_SIZE; num++) {
            if (this.isValidMove(grid, row, col, num)) {
                possibilities.push(num);
            }
        }
        return possibilities;
    }

    /**
     * 找到第一个空单元格
     * @param {Array} grid - 数独网格
     * @returns {Object|null} {row, col} 或 null
     */
    findEmptyCell(grid) {
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                if (grid[row][col] === this.EMPTY_CELL) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    /**
     * 使用回溯算法求解数独
     * @param {Array} grid - 数独网格
     * @returns {boolean} 是否成功求解
     */
    solveSudoku(grid) {
        const emptyCell = this.findEmptyCell(grid);
        if (!emptyCell) {
            return true; // 已完成
        }

        const { row, col } = emptyCell;
        const possibilities = this.getPossibleNumbers(grid, row, col);
        
        // 随机化尝试顺序，增加生成的随机性
        this.shuffleArray(possibilities);

        for (const num of possibilities) {
            grid[row][col] = num;
            
            if (this.solveSudoku(grid)) {
                return true;
            }
            
            grid[row][col] = this.EMPTY_CELL; // 回溯
        }

        return false;
    }

    /**
     * 检查数独是否已完成且正确
     * @param {Array} grid - 数独网格
     * @returns {boolean} 是否完成且正确
     */
    isComplete(grid) {
        // 检查是否有空格
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                if (grid[row][col] === this.EMPTY_CELL) {
                    return false;
                }
            }
        }

        // 检查是否有冲突
        return this.isValidGrid(grid);
    }

    /**
     * 检查整个网格是否有效（无冲突）
     * @param {Array} grid - 数独网格
     * @returns {boolean} 是否有效
     */
    isValidGrid(grid) {
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                const num = grid[row][col];
                if (num !== this.EMPTY_CELL) {
                    // 临时清空当前单元格进行检查
                    grid[row][col] = this.EMPTY_CELL;
                    const isValid = this.isValidMove(grid, row, col, num);
                    grid[row][col] = num; // 恢复值
                    
                    if (!isValid) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /**
     * 检测冲突的单元格
     * @param {Array} grid - 数独网格
     * @returns {Array} 冲突单元格的坐标数组
     */
    getConflicts(grid) {
        const conflicts = [];
        
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                const num = grid[row][col];
                if (num !== this.EMPTY_CELL) {
                    // 临时清空当前单元格进行检查
                    grid[row][col] = this.EMPTY_CELL;
                    const isValid = this.isValidMove(grid, row, col, num);
                    grid[row][col] = num; // 恢复值
                    
                    if (!isValid) {
                        conflicts.push({ row, col });
                    }
                }
            }
        }
        
        return conflicts;
    }

    /**
     * 生成完整的数独解答
     * @returns {Array} 完整的数独网格
     */
    generateCompleteSudoku() {
        const grid = this.createEmptyGrid();
        
        // 填充对角线上的3个九宫格，它们互不影响
        this.fillDiagonalBoxes(grid);
        
        // 求解剩余部分
        this.solveSudoku(grid);
        
        return grid;
    }

    /**
     * 填充对角线上的3个九宫格
     * @param {Array} grid - 数独网格
     */
    fillDiagonalBoxes(grid) {
        for (let boxRow = 0; boxRow < this.GRID_SIZE; boxRow += this.BOX_SIZE) {
            this.fillBox(grid, boxRow, boxRow);
        }
    }

    /**
     * 填充一个3x3九宫格
     * @param {Array} grid - 数独网格
     * @param {number} startRow - 九宫格起始行
     * @param {number} startCol - 九宫格起始列
     */
    fillBox(grid, startRow, startCol) {
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        this.shuffleArray(numbers);
        
        let index = 0;
        for (let i = 0; i < this.BOX_SIZE; i++) {
            for (let j = 0; j < this.BOX_SIZE; j++) {
                grid[startRow + i][startCol + j] = numbers[index++];
            }
        }
    }

    /**
     * 根据难度生成数独谜题
     * @param {string} difficulty - 难度等级 ('easy', 'medium', 'hard')
     * @returns {Object} 包含谜题和解答的对象
     */
    generatePuzzle(difficulty = 'medium') {
        const solution = this.generateCompleteSudoku();
        const puzzle = this.copyGrid(solution);
        
        const config = this.DIFFICULTY_CONFIG[difficulty];
        const cellsToRemove = (this.GRID_SIZE * this.GRID_SIZE) - config.filledCells;
        
        // 创建所有位置的数组
        const positions = [];
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                positions.push({ row, col });
            }
        }
        
        // 随机打乱位置
        this.shuffleArray(positions);
        
        let removed = 0;
        let attempts = 0;
        const maxAttempts = cellsToRemove * 2; // 限制尝试次数以提高性能
        
        for (const pos of positions) {
            if (removed >= cellsToRemove || attempts >= maxAttempts) break;
            
            const { row, col } = pos;
            const backup = puzzle[row][col];
            puzzle[row][col] = this.EMPTY_CELL;
            
            attempts++;
            
            // 简化版本：只对较高难度进行唯一解检查
            if (difficulty === 'hard' && removed > cellsToRemove * 0.7) {
                if (this.hasUniqueSolution(puzzle)) {
                    removed++;
                } else {
                    puzzle[row][col] = backup; // 恢复
                }
            } else {
                // 对于简单和中等难度，直接移除（更快的生成）
                removed++;
            }
        }
        
        return {
            puzzle: this.copyGrid(puzzle),
            solution: this.copyGrid(solution),
            difficulty: difficulty,
            filledCells: this.countFilledCells(puzzle)
        };
    }

    /**
     * 检查谜题是否有唯一解
     * @param {Array} grid - 数独网格
     * @returns {boolean} 是否有唯一解
     */
    hasUniqueSolution(grid) {
        const solutions = [];
        this.findAllSolutions(this.copyGrid(grid), solutions, 2); // 最多找2个解
        return solutions.length === 1;
    }

    /**
     * 找到所有可能的解（限制数量以提高性能）
     * @param {Array} grid - 数独网格
     * @param {Array} solutions - 解答数组
     * @param {number} maxSolutions - 最大解答数量
     */
    findAllSolutions(grid, solutions, maxSolutions = 2) {
        if (solutions.length >= maxSolutions) return;
        
        const emptyCell = this.findEmptyCell(grid);
        if (!emptyCell) {
            solutions.push(this.copyGrid(grid));
            return;
        }

        const { row, col } = emptyCell;
        for (let num = 1; num <= this.GRID_SIZE; num++) {
            if (this.isValidMove(grid, row, col, num)) {
                grid[row][col] = num;
                this.findAllSolutions(grid, solutions, maxSolutions);
                grid[row][col] = this.EMPTY_CELL;
                
                if (solutions.length >= maxSolutions) return;
            }
        }
    }

    /**
     * 计算已填入的单元格数量
     * @param {Array} grid - 数独网格
     * @returns {number} 已填入的单元格数量
     */
    countFilledCells(grid) {
        let count = 0;
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                if (grid[row][col] !== this.EMPTY_CELL) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * 获取提示（返回一个可以填入的正确数字）
     * @param {Array} puzzle - 当前谜题状态
     * @param {Array} solution - 完整解答
     * @returns {Object|null} 提示信息 {row, col, number} 或 null
     */
    getHint(puzzle, solution) {
        const emptyCells = [];
        
        // 收集所有空单元格
        for (let row = 0; row < this.GRID_SIZE; row++) {
            for (let col = 0; col < this.GRID_SIZE; col++) {
                if (puzzle[row][col] === this.EMPTY_CELL) {
                    emptyCells.push({ row, col });
                }
            }
        }
        
        if (emptyCells.length === 0) return null;
        
        // 优先找只有一个可能数字的单元格
        for (const cell of emptyCells) {
            const possibilities = this.getPossibleNumbers(puzzle, cell.row, cell.col);
            if (possibilities.length === 1) {
                return {
                    row: cell.row,
                    col: cell.col,
                    number: possibilities[0]
                };
            }
        }
        
        // 如果没有找到，随机选择一个空单元格
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        return {
            row: randomCell.row,
            col: randomCell.col,
            number: solution[randomCell.row][randomCell.col]
        };
    }

    /**
     * 打乱数组顺序
     * @param {Array} array - 要打乱的数组
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * 获取相关单元格（同行、同列、同九宫格）
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @returns {Array} 相关单元格坐标数组
     */
    getRelatedCells(row, col) {
        const related = new Set();
        
        // 同行
        for (let c = 0; c < this.GRID_SIZE; c++) {
            if (c !== col) {
                related.add(`${row},${c}`);
            }
        }
        
        // 同列
        for (let r = 0; r < this.GRID_SIZE; r++) {
            if (r !== row) {
                related.add(`${r},${col}`);
            }
        }
        
        // 同九宫格
        const startRow = Math.floor(row / this.BOX_SIZE) * this.BOX_SIZE;
        const startCol = Math.floor(col / this.BOX_SIZE) * this.BOX_SIZE;
        
        for (let r = startRow; r < startRow + this.BOX_SIZE; r++) {
            for (let c = startCol; c < startCol + this.BOX_SIZE; c++) {
                if (r !== row || c !== col) {
                    related.add(`${r},${c}`);
                }
            }
        }
        
        return Array.from(related).map(pos => {
            const [r, c] = pos.split(',').map(Number);
            return { row: r, col: c };
        });
    }
}

// 导出数独引擎实例
window.SudokuEngine = SudokuEngine;