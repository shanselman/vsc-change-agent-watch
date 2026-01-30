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
            const gitignorePath = path.join(folder.uri.fsPath, '.gitignore');
            
            if (fs.existsSync(gitignorePath)) {
                try {
                    const content = fs.readFileSync(gitignorePath, 'utf8');
                    const ig = ignore().add(content);
                    
                    // Store with workspace folder URI as key
                    this.ignoreFilters.set(folder.uri.fsPath, ig);
                } catch (error) {
                    console.log(`Failed to load .gitignore from ${gitignorePath}:`, error);
                }
            }
        }
    }

    isIgnored(uri: vscode.Uri): boolean {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            return false;
        }

        const ig = this.ignoreFilters.get(workspaceFolder.uri.fsPath);
        if (!ig) {
            return false;
        }

        const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
        
        // Normalize path separators for cross-platform compatibility
        const normalizedPath = relativePath.split(path.sep).join('/');
        
        return ig.ignores(normalizedPath);
    }

    dispose(): void {
        this.fileWatcher?.dispose();
        this.ignoreFilters.clear();
    }
}
