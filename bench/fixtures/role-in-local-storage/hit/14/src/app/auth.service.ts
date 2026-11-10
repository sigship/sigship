export class AuthService {
  isAdmin() { return localStorage.getItem('isAdmin') === 'true'; }
}
