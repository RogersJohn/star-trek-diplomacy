# Contributing to Star Trek Diplomacy

Thank you for your interest in contributing to Star Trek Diplomacy! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/star-trek-diplomacy.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes thoroughly
6. Commit: `git commit -m "Description of changes"`
7. Push: `git push origin feature/your-feature-name`
8. Open a Pull Request

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Local Development

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Run development servers
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev
```

## Code Style

- Use ES6+ JavaScript features
- Follow existing code formatting (we recommend using Prettier)
- Write meaningful commit messages
- Add comments for complex logic
- Keep functions small and focused

## Testing

Before submitting a PR:
- Test all affected game mechanics
- Ensure the UI works in modern browsers
- Check that builds complete successfully
- Test with multiple players if applicable

## Pull Request Guidelines

- **Title**: Clear, concise description of the change
- **Description**: Explain what and why, link related issues
- **Scope**: Keep PRs focused on a single feature/fix
- **Testing**: Describe how you tested the changes
- **Screenshots**: Include for UI changes

## Areas for Contribution

### High Priority
- [ ] Database persistence layer
- [ ] WebSocket/real-time updates
- [ ] Turn timer system
- [ ] Private messaging
- [ ] Spectator mode
- [ ] Tutorial/help system

### Game Features
- [ ] AI players
- [ ] Replay system
- [ ] Game statistics and analytics
- [ ] Custom map editor
- [ ] Additional victory conditions

### UI/UX
- [ ] 3D map visualization (Three.js)
- [ ] Mobile responsive design
- [ ] Accessibility improvements
- [ ] Animation polish
- [ ] Sound effects

### Infrastructure
- [ ] Unit tests
- [ ] Integration tests
- [ ] CI/CD pipeline improvements
- [ ] Performance optimization
- [ ] Security hardening

## Bug Reports

When filing a bug report, include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS information
- Screenshots/videos if applicable
- Error messages from console

## Feature Requests

For new features:
- Check existing issues first
- Explain the use case
- Describe the proposed solution
- Consider game balance implications
- Discuss in an issue before implementing

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the Code of Conduct

## Questions?

- Open an issue with the "question" label
- Join our community discussions
- Check the documentation in `/docs`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🖖
