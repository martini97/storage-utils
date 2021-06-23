import * as utils from '../src/utils';

describe('utils.parseJson', () => {
  const data = [
    {input: '{"foo": 1}', output: {foo: 1}},
    {input: 'undefined', output: undefined},
    {input: 'null', output: null},
    {input: '"some string"', output: 'some string'},
    {
      input: '{"complex": true, "fields": [{"foo": 1}, {"bar": 2}]}',
      output: {complex: true, fields: [{foo: 1}, {bar: 2}]},
    },
  ];

  data.forEach(({input, output}) => {
    it(`${input} => ${JSON.stringify(output)}`, () => {
      expect(utils.parseJson(input)).toStrictEqual(output);
    });
  });
});
