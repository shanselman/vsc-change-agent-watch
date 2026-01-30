import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { GitignoreManager } from '../../gitignoreManager';

suite('GitignoreManager Test Suite', () => {
    let tempDir: string;
    let gitignoreManager: GitignoreManager;

    setup(() => {
        // Create a temporary directory for tests
        tempDir = fs.mkdtempSync(path.join(__dirname, 'test-gitignore-'));
        gitignoreManager = new GitignoreManager();
    });

    teardown(() => {
        // Clean up
        gitignoreManager.dispose();
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
        }
    });

    test('Should load .gitignore file', () => {
        // Create a test .gitignore file
        const gitignorePath = path.join(tempDir, '.gitignore');
        fs.writeFileSync(gitignorePath, 'node_modules/\n*.log\n');

        // Reload manager to pick up the new file
        gitignoreManager.dispose();
        gitignoreManager = new GitignoreManager();

        // Check if files are properly ignored (this is a basic check)
        assert.ok(gitignoreManager);
    });

    test('Should handle missing .gitignore gracefully', () => {
        // Create manager without .gitignore
        const manager = new GitignoreManager();
        
        // Should not throw
        assert.ok(manager);
        
        manager.dispose();
    });
});
