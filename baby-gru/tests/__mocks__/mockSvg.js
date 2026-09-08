const React = require('react');

const MockSvg = (props) => React.createElement('svg', { ...props, 'data-testid': 'mock-svg' });

module.exports = MockSvg;
module.exports.default = MockSvg;
