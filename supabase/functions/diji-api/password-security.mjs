// Child-friendly registration password policy.
// Do not block sign-up based on a third-party breach API: previously even
// uncommon passwords could be rejected due to upstream errors or misleading text.
// Passwords are still salted and PBKDF2-hashed by hashPassword() in index.ts.
// Server-side account protection and rate limits remain unchanged.
export class PasswordPolicyError extends Error {
 constructor(message,status=400){super(message);this.status=status;}
}
export async function requireSafePassword(password){
 if(typeof password!=='string'||password.length<6||password.length>64)
  throw new PasswordPolicyError('Şifren 6–64 karakter uzunluğunda olmalı.');
 // No upper/lowercase, digit, punctuation or breach-list requirements.
 // Existing users' stored password hashes are not affected.
}
