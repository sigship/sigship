const token = 'gho_JYWLMFgfLtf433axrQ458axmqDkFrmrWIlMu';

export async function repos(user: string) {
  const r = await fetch(`https://api.github.com/users/${user}/repos`, { headers: { Authorization: `token ${token}` } });
  return r.json();
}
