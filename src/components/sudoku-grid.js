/**
 * 数独网格组件 - 处理网格渲染和用户交互
 */
class SudokuGrid {
    constructor(container, gameController) {
        this.container = container;
        this.gameController = gameController;
        this.cells = [];
        this.selectedNumber = null;
        
        this.init();
        this.bindEvents();
    }

    /**
     * 初始化网格
     */
    init() {
        this.container.innerHTML = '';
        this.cells = [];
        
        // 创建9x9网格
        for (let row = 0; row < 9; row++) {
            const rowCells = [];
            for (let col = 0; col < 9; col++) {
                const cell = this.createCell(row, col);
                this.container.appendChild(cell);
                rowCells.push(cell);
            }
            this.cells.push(rowCells);
        }
    }

    /**
     * 创建单个单元格
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @returns {HTMLElement} 单元格元素
     */
    createCell(row, col) {
        const cell = document.createElement('div');
        cell.className = 'sudoku-cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        
        // 添加九宫格边界样式
        this.addBoxBorders(cell, row, col);
        
        // 添加点击事件
        cell.addEventListener('click', () => {
            this.handleCellClick(row, col);
        });
        
        return cell;
    }

    /**
     * 添加九宫格边界样式
     * @param {HTMLElement} cell - 单元格元素
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     */
    addBoxBorders(cell, row, col) {
        // 右边界（每3列）
        if ((col + 1) % 3 === 0 && col < 8) {
            cell.style.borderRight = '3px solid var(--border-thick)';
        }
        
        // 下边界（每3行）
        if ((row + 1) % 3 === 0 && row < 8) {
            cell.style.borderBottom = '3px solid var(--border-thick)';
        }
    }

    /**
     * 处理单元格点击
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     */
    handleCellClick(row, col) {
        const gameState = this.gameController.getGameState();
        
        if (gameState.status !== 'playing' || gameState.isPaused) {
            return;
        }
        
        // 选择单元格
        this.gameController.selectCell(row, col);
        
        // 如果有选中的数字，直接输入
        if (this.selectedNumber !== null) {
            this.inputNumber(row, col, this.selectedNumber);
        }
    }

    /**
     * 在指定位置输入数字
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @param {number} number - 数字
     */
    inputNumber(row, col, number) {
        this.gameController.inputNumber(row, col, number);
    }

    /**
     * 清除指定位置的数字
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     */
    clearCell(row, col) {
        this.gameController.clearCell(row, col);
    }

    /**
     * 更新网格显示
     * @param {Object} gameState - 游戏状态
     */
    updateGrid(gameState) {
        if (!gameState.currentGrid) return;
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                this.updateCell(row, col, gameState);
            }
        }
        
        // 更新选中状态和高亮
        this.updateSelection(gameState);
        this.updateHighlights(gameState);
        this.updateConflicts(gameState);
    }

    /**
     * 更新单个单元格
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @param {Object} gameState - 游戏状态
     */
    updateCell(row, col, gameState) {
        const cell = this.cells[row][col];
        const value = gameState.currentGrid[row][col];
        const isInitial = gameState.isInitial[row][col];
        
        // 更新数字显示
        if (value === 0) {
            cell.textContent = '';
        } else {
            cell.textContent = value;
        }
        
        // 更新样式
        cell.className = 'sudoku-cell';
        
        if (isInitial) {
            cell.classList.add('initial');
        }
        
        // 添加暂停状态
        if (gameState.isPaused) {
            cell.classList.add('paused');
        }
    }

    /**
     * 更新选中状态
     * @param {Object} gameState - 游戏状态
     */
    updateSelection(gameState) {
        // 清除之前的选中状态
        this.container.querySelectorAll('.selected').forEach(cell => {
            cell.classList.remove('selected');
        });
        
        // 添加新的选中状态
        if (gameState.selectedCell) {
            const { row, col } = gameState.selectedCell;
            this.cells[row][col].classList.add('selected');
        }
    }

    /**
     * 更新高亮显示
     * @param {Object} gameState - 游戏状态
     */
    updateHighlights(gameState) {
        // 清除之前的高亮
        this.container.querySelectorAll('.highlighted').forEach(cell => {
            cell.classList.remove('highlighted');
        });
        
        if (gameState.selectedCell) {
            const { row, col } = gameState.selectedCell;
            const relatedCells = this.gameController.getRelatedCells(row, col);
            
            // 高亮相关单元格
            relatedCells.forEach(({ row: r, col: c }) => {
                this.cells[r][c].classList.add('highlighted');
            });
            
            // 高亮相同数字
            const selectedValue = gameState.currentGrid[row][col];
            if (selectedValue !== 0) {
                this.highlightSameNumbers(selectedValue);
            }
        }
    }

    /**
     * 高亮相同数字
     * @param {number} number - 要高亮的数字
     */
    highlightSameNumbers(number) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = this.cells[row][col];
                if (cell.textContent == number) {
                    cell.classList.add('highlighted');
                }
            }
        }
    }

    /**
     * 更新冲突显示
     * @param {Object} gameState - 游戏状态
     */
    updateConflicts(gameState) {
        // 清除之前的冲突标记
        this.container.querySelectorAll('.conflict').forEach(cell => {
            cell.classList.remove('conflict');
        });
        
        // 添加冲突标记
        gameState.conflicts.forEach(({ row, col }) => {
            this.cells[row][col].classList.add('conflict');
        });
    }

    /**
     * 设置选中的数字
     * @param {number} number - 数字
     */
    setSelectedNumber(number) {
        this.selectedNumber = number;
    }

    /**
     * 清除选中的数字
     */
    clearSelectedNumber() {
        this.selectedNumber = null;
    }

    /**
     * 显示提示动画
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     */
    showHintAnimation(row, col) {
        const cell = this.cells[row][col];
        cell.classList.add('hint');
        
        setTimeout(() => {
            cell.classList.remove('hint');
        }, 1000);
    }

    /**
     * 显示错误动画
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     */
    showErrorAnimation(row, col) {
        const cell = this.cells[row][col];
        cell.classList.add('shake');
        
        setTimeout(() => {
            cell.classList.remove('shake');
        }, 400);
    }

    /**
     * 显示完成动画
     */
    showCompletionAnimation() {
        this.container.classList.add('celebration');
        
        setTimeout(() => {
            this.container.classList.remove('celebration');
        }, 600);
    }

    /**
     * 设置暂停状态
     * @param {boolean} isPaused - 是否暂停
     */
    setPausedState(isPaused) {
        if (isPaused) {
            this.container.classList.add('game-paused');
        } else {
            this.container.classList.remove('game-paused');
        }
    }

    /**
     * 绑定键盘事件
     */
    bindEvents() {
        document.addEventListener('keydown', (e) => {
            const gameState = this.gameController.getGameState();
            
            if (gameState.status !== 'playing' || gameState.isPaused) {
                return;
            }
            
            if (gameState.selectedCell) {
                const { row, col } = gameState.selectedCell;
                
                // 数字键 1-9
                if (e.key >= '1' && e.key <= '9') {
                    e.preventDefault();
                    this.inputNumber(row, col, parseInt(e.key));
                }
                
                // Delete/Backspace 键清除
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    this.clearCell(row, col);
                }
                
                // 箭头键移动选择
                if (e.key.startsWith('Arrow')) {
                    e.preventDefault();
                    this.handleArrowKey(e.key, row, col);
                }
            }
            
            // 全局快捷键
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'z':
                        e.preventDefault();
                        this.gameController.undo();
                        break;
                    case 's':
                        e.preventDefault();
                        // 触发保存游戏的操作
                        break;
                }
            }
        });
    }

    /**
     * 处理箭头键移动
     * @param {string} key - 按键名
     * @param {number} row - 当前行
     * @param {number} col - 当前列
     */
    handleArrowKey(key, row, col) {
        let newRow = row;
        let newCol = col;
        
        switch (key) {
            case 'ArrowUp':
                newRow = Math.max(0, row - 1);
                break;
            case 'ArrowDown':
                newRow = Math.min(8, row + 1);
                break;
            case 'ArrowLeft':
                newCol = Math.max(0, col - 1);
                break;
            case 'ArrowRight':
                newCol = Math.min(8, col + 1);
                break;
        }
        
        if (newRow !== row || newCol !== col) {
            this.gameController.selectCell(newRow, newCol);
        }
    }

    /**
     * 清除所有样式
     */
    clearAllStyles() {
        this.container.querySelectorAll('.sudoku-cell').forEach(cell => {
            cell.className = 'sudoku-cell';
        });
    }

    /**
     * 获取单元格元素
     * @param {number} row - 行索引
     * @param {number} col - 列索引
     * @returns {HTMLElement} 单元格元素
     */
    getCell(row, col) {
        return this.cells[row][col];
    }

    /**
     * 销毁组件
     */
    destroy() {
        this.clearAllStyles();
        this.container.innerHTML = '';
        this.cells = [];
        this.selectedNumber = null;
    }
}

// 导出数独网格组件
window.SudokuGrid = SudokuGrid;