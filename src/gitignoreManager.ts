import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import ignore, { Ignore } from 'ignore';

export class GitignoreManager implements vscode.Disposable {
    private ignoreFilters: Map<string, Ignore> = new Map();
    private fileWatcher: vscode.FileSystemWatcher | undefined;

    constructor() {
        this.loadGitignoreFiles();
        this.setupFileWatcher();
    }

    private setupFileWatcher(): void {
        // Watch for .gitignore file changes
        this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/.gitignore');
        
        this.fileWatcher.onDidCreate(() => this.loadGitignoreFiles());
        this.fileWatcher.onDidChange(() => this.loadGitignoreFiles());
        this.fileWatcher.onDidDelete(() => this.loadGitignoreFiles());
    }

    private loadGitignoreFiles(): void {
        this.ignoreFilters.clear();

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return;
        }

        for (const folder of workspaceFolders) {
            this.loadGitignoreForFolder(folder.uri.fsPath, folder.uri.fsPath);
        }
    }

    private loadGitignoreForFolder(folderPath: string, workspaceRoot: string): void {
        const gitignorePath = path.join(folderPath, '.gitignore');
        
        if (fs.existsSync(gitignorePath)) {
            try {
                const content = fs.readFileSync(gitignorePath, 'utf8');
                const ig = ignore().add(content);
                
                // Store with relative path from workspace root as key
                const relativePath = path.relative(workspaceRoot, folderPath);
                const key = relativePath || '.';
                this.ignoreFilters.set(key, ig);
            } catch (error) {
                console.log(`Failed to load .gitignore from ${gitignorePath}:`, error);
            }
        }

        // Recursively check subdirectories for .gitignore files
        try {
            const entries = fs.readdirSync(folderPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules') {
                    const subPath = path.join(folderPath, entry.name);
                    this.loadGitignoreForFolder(subPath, workspaceRoot);
                }
            }
        } catch (error) {
            // Directory might not be readable, skip
        }
    }

    isIgnored(uri: vscode.Uri): boolean {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            return false;
        }

        const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
        
        // Check all gitignore filters from root to the file's directory
        for (const [filterPath, ig] of this.ignoreFilters.entries()) {
            // Determine the path relative to this .gitignore file
            let pathToCheck: string;
            
            if (filterPath === '.') {
                // Root .gitignore
                pathToCheck = relativePath;
            } else {
                // Check if the file is under this .gitignore's directory
                if (relativePath.startsWith(filterPath + path.sep) || relativePath === filterPath) {
                    pathToCheck = path.relative(filterPath, relativePath);
                } else {
                    continue;
                }
            }

            // Normalize path separators for cross-platform compatibility
            const normalizedPath = pathToCheck.split(path.sep).join('/');
            
            if (ig.ignores(normalizedPath)) {
                return true;
            }
        }

        return false;
    }

    dispose(): void {
        this.fileWatcher?.dispose();
        this.ignoreFilters.clear();
    }
}
