import CreativeWorkshopClient from './CreativeWorkshopClient';
import { getAlbums, getChatters, getFriends, getMoments, getPosts } from '../../lib/content-store';

export default async function CreativeWorkshopPage() {
  const posts = (await getPosts()).map((p) => ({ ...p, id: p.slug, type: 'post', cover: p.cover || null }));
  const chatters = (await getChatters()).map((c) => ({ ...c, id: c.slug, type: 'chatter', cover: c.cover || null }));
  const moments = (await getMoments()).map((m) => ({ ...m, slug: m.id, title: m.content.slice(0, 20), type: 'moment', cover: m.images?.[0] || null }));
  const albums = await getAlbums();
  const friends = await getFriends();

  return (
    <CreativeWorkshopClient
      posts={posts}
      chatters={chatters}
      moments={moments}
      albums={albums}
      friends={friends}
    />
  );
}