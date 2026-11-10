jest.mock('openai', () => ({ default: jest.fn().mockImplementation((o) => ({ opts: o })) }));
