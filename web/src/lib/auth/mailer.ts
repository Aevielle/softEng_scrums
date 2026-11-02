export async function sendResetEmail(to: string, link: string, ttlMin: number) {
  console.log(
    `\n[DEMO] Password reset link for ${to} (expires in ${ttlMin} min):\n${link}\n`
  );
}