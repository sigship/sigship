import { Component } from 'react';
export class AppErrorBoundary extends Component { static getDerivedStateFromError() { return { err: true }; } render() { return this.props.children; } }
