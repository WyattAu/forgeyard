import { createSignal, Show } from 'solid-js';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

const sampleTree: FileNode = {
  name: 'my-project/',
  type: 'directory',
  children: [
    { name: 'Cargo.toml', type: 'file' },
    { name: 'src/', type: 'directory', children: [
      { name: 'main.rs', type: 'file' },
      { name: 'lib.rs', type: 'file' },
    ]},
    { name: 'README.md', type: 'file' },
    { name: '.gitignore', type: 'file' },
  ],
};

const sampleCode = `[package]
name = "my-project"
version = "0.1.0"
edition = "2021"

[dependencies]
clap = { version = "4.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }`;

function TreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [expanded, setExpanded] = createSignal(node.type === 'directory');
  
  return (
    <div>
      <div
        style={{
          padding: '0.25rem 0.5rem',
          'padding-left': `${depth * 1.5}rem`,
          cursor: node.type === 'directory' ? 'pointer' : 'default',
          color: node.type === 'directory' ? '#f59e0b' : '#a1a1a1',
          'font-family': 'monospace',
          'font-size': '0.9rem',
        }}
        onClick={() => node.type === 'directory' && setExpanded(!expanded())}
      >
        {node.type === 'directory' ? (expanded() ? '▼ ' : '▶ ') : '  '}
        {node.type === 'directory' ? '📁 ' : '📄 '}
        {node.name}
      </div>
      <Show when={expanded() && node.children}>
        {node.children!.map((child) => (
          <TreeNode node={child} depth={depth + 1} />
        ))}
      </Show>
    </div>
  );
}

export default function CodePreview() {
  const [activeTab, setActiveTab] = createSignal<'tree' | 'code'>('tree');

  return (
    <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 1.5rem;">
      <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
        <button
          onClick={() => setActiveTab('tree')}
          style={{
            background: activeTab() === 'tree' ? '#2a2a2a' : 'transparent',
            border: 'none',
            color: activeTab() === 'tree' ? '#f59e0b' : '#888',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            'border-bottom': activeTab() === 'tree' ? '2px solid #f59e0b' : '2px solid transparent',
          }}
        >
          File Tree
        </button>
        <button
          onClick={() => setActiveTab('code')}
          style={{
            background: activeTab() === 'code' ? '#2a2a2a' : 'transparent',
            border: 'none',
            color: activeTab() === 'code' ? '#f59e0b' : '#888',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            'border-bottom': activeTab() === 'code' ? '2px solid #f59e0b' : '2px solid transparent',
          }}
        >
          Preview
        </button>
      </div>

      <div style="background: #0a0a0a; border-radius: 8px; padding: 1rem; min-height: 300px; overflow: auto;">
        <Show when={activeTab() === 'tree'}>
          <TreeNode node={sampleTree} />
        </Show>
        <Show when={activeTab() === 'code'}>
          <pre style={{
            color: '#a1a1a1',
            'font-family': 'monospace',
            'font-size': '0.85rem',
            'white-space': 'pre-wrap',
            margin: 0,
          }}>
            <code>{sampleCode}</code>
          </pre>
        </Show>
      </div>
    </div>
  );
}
