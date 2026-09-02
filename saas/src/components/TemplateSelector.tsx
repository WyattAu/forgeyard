import { createSignal, onMount, Show } from 'solid-js';

interface Template {
  name: string;
}

const templateDescriptions: Record<string, string> = {
  'rust': 'Fast, memory-safe CLI tools and libraries',
  'astro': 'Modern static sites with island architecture',
  'starlight': 'Beautiful documentation sites',
  'typescript': 'Type-safe projects with proper config',
};

export default function TemplateSelector() {
  const [templates, setTemplates] = createSignal<Template[]>([]);
  const [selected, setSelected] = createSignal<string>('');
  const [projectName, setProjectName] = createSignal<string>('');
  const [loading, setLoading] = createSignal<boolean>(false);
  const [error, setError] = createSignal<string>('');

  onMount(async () => {
    try {
      const res = await fetch('/api/scaffold');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.map((t: string) => ({ name: t })));
        if (data.length > 0) {
          setSelected(data[0]);
        }
      }
    } catch {
      setTemplates([
        { name: 'rust' },
        { name: 'astro' },
        { name: 'starlight' },
        { name: 'typescript' },
      ]);
    }
  });

  const handleScaffold = async () => {
    if (!selected() || !projectName()) {
      setError('Please select a template and enter a project name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: selected(),
          projectName: projectName(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to scaffold project');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 1.5rem;">
      <h3 style="margin-bottom: 1rem; color: #f59e0b;">Choose Template</h3>
      
      <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem;">
        {templates().map((t) => (
          <button
            onClick={() => setSelected(t.name)}
            style={{
              background: selected() === t.name ? '#2a2a2a' : 'transparent',
              border: `1px solid ${selected() === t.name ? '#f59e0b' : '#3a3a3a'}`,
              color: selected() === t.name ? '#f59e0b' : '#888',
              padding: '0.75rem 1rem',
              'border-radius': '8px',
              cursor: 'pointer',
              'text-align': 'left',
              transition: 'all 0.2s',
            }}
          >
            <div style="font-weight: 600;">{t.name}</div>
            <div style="font-size: 0.8rem; opacity: 0.7; margin-top: 0.25rem;">
              {templateDescriptions[t.name] || 'Project template'}
            </div>
          </button>
        ))}
      </div>

      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; color: #888; font-size: 0.9rem;">
          Project Name
        </label>
        <input
          type="text"
          placeholder="my-project"
          value={projectName()}
          onInput={(e) => setProjectName(e.currentTarget.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#0a0a0a',
            border: '1px solid #3a3a3a',
            'border-radius': '8px',
            color: '#ededed',
            'font-size': '1rem',
          }}
        />
      </div>

      <Show when={error()}>
        <div style="color: #ef4444; margin-bottom: 1rem; font-size: 0.9rem;">
          {error()}
        </div>
      </Show>

      <button
        onClick={handleScaffold}
        disabled={loading() || !selected() || !projectName()}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: loading() ? '#666' : '#f59e0b',
          border: 'none',
          'border-radius': '8px',
          color: '#000',
          'font-weight': 600,
          'font-size': '1rem',
          cursor: loading() ? 'not-allowed' : 'pointer',
        }}
      >
        {loading() ? 'Scaffolding...' : 'Download Project'}
      </button>
    </div>
  );
}
