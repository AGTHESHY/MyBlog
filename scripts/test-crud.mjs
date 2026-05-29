#!/usr/bin/env node
/**
 * 通过管理后台 API 验证 MySQL CRUD。
 * 用法：node scripts/test-crud.mjs
 * 可选：MANAGER_URL=http://localhost:3001
 */
const BASE = process.env.MANAGER_URL || 'http://localhost:3001';
const TS = Date.now();
const ids = {
  moment: `crud-moment-${TS}`,
  post: `crud-post-${TS}`,
  chatter: `crud-chatter-${TS}`,
  friend: `crud-friend-${TS}`,
  project: `crud-project-${TS}`,
  album: `crud-album-${TS}`,
};

const results = [];

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${path}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
    console.error(`✗ ${name}: ${e.message}`);
  }
}

async function main() {
  console.log(`Testing CRUD against ${BASE}\n`);

  await test('moments: create', () =>
    api('POST', '/api/moments/save', {
      id: ids.moment,
      content: 'CRUD test moment',
      location: 'test',
      images: [],
    })
  );

  await test('moments: update', () =>
    api('POST', '/api/moments/save', {
      id: ids.moment,
      content: 'CRUD test moment updated',
      location: 'test',
      images: [],
    })
  );

  await test('posts: create draft', () =>
    api('POST', '/api/drafts/save', {
      type: 'post',
      id: ids.post,
      title: 'CRUD Test Post',
      content: '# hello',
      description: 'test',
      published: false,
      tags: ['test'],
    })
  );

  await test('posts: publish', () =>
    api('POST', '/api/drafts/save', {
      type: 'post',
      id: ids.post,
      title: 'CRUD Test Post',
      content: '# hello published',
      description: 'test',
      published: true,
      tags: ['test'],
    })
  );

  await test('chatters: create & publish', () =>
    api('POST', '/api/drafts/save', {
      type: 'chatter',
      id: ids.chatter,
      title: 'CRUD Chatter',
      content: 'chatter body',
      mood: 'ok',
      published: true,
      tags: [],
    })
  );

  await test('about: site_settings', () =>
    api('POST', '/api/drafts/save', {
      type: 'about',
      content: '# about crud test',
      cover: 'https://example.com/cover.jpg',
    })
  );

  await test('config: update', () =>
    api('POST', '/api/config/update', {
      updates: { crud_test_key: 'crud_test_value' },
    })
  );

  await test('config: read', async () => {
    const json = await api('GET', '/api/config/get');
    if (!json.success) throw new Error('config get failed');
  });

  await test('friends: sync', () =>
    api('POST', '/api/friends/sync', {
      friends: [
        {
          id: ids.friend,
          name: 'CRUD Friend',
          url: 'https://example.com',
          description: 'test',
          avatar: '',
          themeColor: '#6366f1',
        },
      ],
    })
  );

  await test('friends: read', async () => {
    const json = await api('GET', '/api/content/friends');
    if (!json.data?.some((f) => f.id === ids.friend)) throw new Error('friend not found');
  });

  await test('projects: sync', () =>
    api('POST', '/api/projects/sync', {
      projects: [
        {
          id: ids.project,
          name: 'CRUD Project',
          description: 'test',
          icon: '🚀',
          githubUrl: 'https://github.com',
          tags: ['test'],
        },
      ],
    })
  );

  await test('projects: read', async () => {
    const json = await api('GET', '/api/content/projects');
    if (!json.data?.some((p) => p.id === ids.project)) throw new Error('project not found');
  });

  await test('albums: sync', () =>
    api('POST', '/api/gallery/sync', {
      albums: [
        {
          id: ids.album,
          title: 'CRUD Album',
          description: 'test',
          cover: 'https://example.com/photo.jpg',
          date: '2026-05-29',
          photos: [{ url: 'https://example.com/photo.jpg', caption: 'cap' }],
        },
      ],
    })
  );

  await test('albums: read', async () => {
    const json = await api('GET', '/api/content/albums');
    if (!json.data?.some((a) => a.id === ids.album)) throw new Error('album not found');
  });

  await test('drafts: list', async () => {
    const json = await api('POST', '/api/drafts/list');
    if (!json.success) throw new Error('drafts list failed');
  });

  await test('drafts: get post', async () => {
    const json = await api('POST', '/api/drafts/get', { id: ids.post, type: 'post' });
    if (!json.success || !json.draft) throw new Error('post not found');
  });

  await test('moments: delete', () => api('POST', '/api/moments/delete', { id: ids.moment }));

  await test('drafts: delete post & chatter', () =>
    api('POST', '/api/drafts/delete', { id: ids.post })
  );

  await test('drafts: delete chatter cleanup', () =>
    api('POST', '/api/drafts/delete', { id: ids.chatter })
  );

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
