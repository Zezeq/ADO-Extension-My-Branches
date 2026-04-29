module.exports = {
  init: jest.fn().mockResolvedValue(undefined),
  ready: jest.fn().mockResolvedValue(undefined),
  getUser: jest.fn().mockReturnValue({ name: 'test@example.com', displayName: 'Test User' }),
  getService: jest.fn().mockResolvedValue({}),
  getExtensionContext: jest.fn().mockReturnValue({ id: 'test-publisher.test-extension' }),
  getAccessToken: jest.fn().mockResolvedValue('mock-token'),
};
