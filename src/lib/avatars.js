// Playable characters. `e` is the id saved on the Supabase user (user_metadata.avatar) and shown in badges.
// body: 'm' | 'f'   style: bald | buzz | short | cap | mohawk | afro | dreads | curly | long | bob | ponytail | bun | hijab
// beard: 'full' | 'stache'   glasses: true | 'sun'
export const LOOKS = [
  { e: '😎', name: 'Marcus', body: 'm', skin: '#c68642', hair: '#111827', style: 'short', glasses: 'sun' },
  { e: '👨🏿‍🦲', name: 'Kofi', body: 'm', skin: '#6b3f1d', hair: '#111111', style: 'bald', beard: 'full' },
  { e: '👨🏾‍🦱', name: 'Dre', body: 'm', skin: '#8d5524', hair: '#1a1209', style: 'dreads' },
  { e: '👩🏾‍🦱', name: 'Imani', body: 'f', skin: '#8d5524', hair: '#1a1209', style: 'afro' },
  { e: '👩🏿', name: 'Zuri', body: 'f', skin: '#5c3317', hair: '#140d07', style: 'dreads' },
  { e: '👨🏻', name: 'Jack', body: 'm', skin: '#f5cfa0', hair: '#5b3a1e', style: 'short' },
  { e: '👩🏼', name: 'Emma', body: 'f', skin: '#f9d5b8', hair: '#e6c15a', style: 'long' },
  { e: '👩🏻‍🦰', name: 'Molly', body: 'f', skin: '#f7cfae', hair: '#b7410e', style: 'ponytail' },
  { e: '🧔🏽', name: 'Omar', body: 'm', skin: '#c68642', hair: '#1f1a14', style: 'short', beard: 'full' },
  { e: '👩🏽', name: 'Priya', body: 'f', skin: '#c68642', hair: '#111827', style: 'bun' },
  { e: '👨🏼‍🦳', name: 'Gramps', body: 'm', skin: '#f0c8a0', hair: '#d1d5db', style: 'buzz', beard: 'stache', glasses: true },
  { e: '👵🏽', name: 'Nana', body: 'f', skin: '#d9a066', hair: '#d1d5db', style: 'bun', glasses: true },
  { e: '🧑🏻‍🎤', name: 'Rocky', body: 'm', skin: '#f1c27d', hair: '#7c3aed', style: 'mohawk' },
  { e: '👱🏻‍♀️', name: 'Lily', body: 'f', skin: '#fbd9bd', hair: '#f5d76e', style: 'bob' },
  { e: '🤠', name: 'Tex', body: 'm', skin: '#e0ac69', hair: '#7c2d12', style: 'cap', beard: 'stache' },
  { e: '👩🏾', name: 'Nia', body: 'f', skin: '#a0663a', hair: '#111827', style: 'bob' },
  { e: '🧑🏿‍🦱', name: 'Zane', body: 'm', skin: '#4a2c17', hair: '#0b0b0b', style: 'curly' },
  { e: '🧕🏽', name: 'Aisha', body: 'f', skin: '#c68642', hair: '#14b8a6', style: 'hijab' },
  { e: '🤖', name: 'Robo', body: 'm', skin: '#cbd5e1', hair: '#1e1b4b', style: 'cap', glasses: 'sun' },
  { e: '👽', name: 'Zorp', body: 'm', skin: '#bef264', hair: '#365314', style: 'bald', glasses: 'sun' },
]
export const AVATARS = LOOKS.map(l => l.e)
export const lookFor = e => LOOKS.find(l => l.e === e) || LOOKS[0]