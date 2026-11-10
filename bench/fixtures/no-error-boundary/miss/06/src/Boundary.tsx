import { Component } from 'react';
export class Boundary extends Component<{ children: any }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(e) { console.error(e); }
  render() { return this.state.err ? <p>Oops</p> : this.props.children; }
}
