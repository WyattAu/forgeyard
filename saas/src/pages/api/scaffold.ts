import type { APIRoute } from 'astro';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

interface ScaffoldRequest {
  template: string;
  projectName: string;
}

interface TemplateFile {
  path: string;
  content: string;
}

function walkDir(dir: string, baseDir: string): TemplateFile[] {
  const files: TemplateFile[] = [];
  
  if (!existsSync(dir)) {
    return files;
  }
  
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...walkDir(fullPath, baseDir));
    } else {
      const relativePath = relative(baseDir, fullPath);
      const content = readFileSync(fullPath, 'utf-8');
      files.push({ path: relativePath, content });
    }
  }
  
  return files;
}

function createZip(files: TemplateFile[]): Blob {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  
  for (const file of files) {
    const nameBytes = encoder.encode(file.path);
    const contentBytes = encoder.encode(file.content);
    
    parts.push(nameBytes);
    parts.push(encoder.encode('\n---\n'));
    parts.push(contentBytes);
    parts.push(encoder.encode('\n'));
  }
  
  return new Blob(parts, { type: 'text/plain' });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as ScaffoldRequest;
    const { template, projectName } = body;

    if (!template || !projectName) {
      return new Response(JSON.stringify({ error: 'template and projectName are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!/^[a-z0-9-]+$/.test(projectName)) {
      return new Response(JSON.stringify({ error: 'projectName must be lowercase alphanumeric with hyphens' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const templatesDir = join(process.cwd(), '..', 'templates', template);
    
    if (!existsSync(templatesDir)) {
      return new Response(JSON.stringify({ error: `Template '${template}' not found` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const files = walkDir(templatesDir, templatesDir);
    
    const modifiedFiles = files.map(file => ({
      ...file,
      content: file.content.replace(/\{\{project_name\}\}/g, projectName),
    }));

    const blob = createZip(modifiedFiles);
    
    return new Response(blob, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${projectName}.zip"`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = async () => {
  const templatesDir = join(process.cwd(), '..', 'templates');
  
  if (!existsSync(templatesDir)) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const entries = readdirSync(templatesDir);
  const templates = entries.filter(entry => {
    const fullPath = join(templatesDir, entry);
    return statSync(fullPath).isDirectory();
  });

  return new Response(JSON.stringify(templates), {
    headers: { 'Content-Type': 'application/json' },
  });
};
