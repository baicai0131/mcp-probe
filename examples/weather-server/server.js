#!/usr/bin/env node

/**
 * Example Weather MCP Server
 */

import readline from 'node:readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

const WEATHER_DATABASE = {
  'San Francisco': { temp: 18, condition: 'Partly Cloudy', humidity: 75 },
  'New York': { temp: 24, condition: 'Sunny', humidity: 55 },
  'Tokyo': { temp: 22, condition: 'Rainy', humidity: 85 },
  'Beijing': { temp: 26, condition: 'Clear', humidity: 40 },
  'London': { temp: 15, condition: 'Overcast', humidity: 80 }
};

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let req;
  try {
    req = JSON.parse(trimmed);
  } catch {
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    return;
  }

  if (req.id === undefined) return; // ignore notifications
  const { id, method, params } = req;

  switch (method) {
    case 'initialize':
      send({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'weather-service', version: '1.0.0' }
        }
      });
      break;

    case 'tools/list':
      send({
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'get_current_weather',
              description: 'Get current real-time weather for a given city',
              inputSchema: {
                type: 'object',
                properties: {
                  city: { type: 'string', description: 'Name of the city' },
                  unit: { type: 'string', enum: ['celsius', 'fahrenheit'], description: 'Temperature unit' }
                },
                required: ['city']
              }
            }
          ]
        }
      });
      break;

    case 'tools/call': {
      const tool = params?.name;
      const args = params?.arguments || {};

      if (tool === 'get_current_weather') {
        const city = args.city;
        if (!city || typeof city !== 'string') {
          send({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: 'Error: city name is required and must be a string' }],
              isError: true
            }
          });
          return;
        }

        const data = WEATHER_DATABASE[city];
        if (!data) {
          send({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: `Error: weather data not available for city '${city}'` }],
              isError: true
            }
          });
          return;
        }

        const unit = args.unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
        const temp = unit === 'fahrenheit' ? Math.round((data.temp * 9) / 5 + 32) : data.temp;

        send({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                city,
                temperature: temp,
                unit: unit === 'fahrenheit' ? '°F' : '°C',
                condition: data.condition,
                humidity: `${data.humidity}%`
              })
            }],
            isError: false
          }
        });
        return;
      }

      send({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Tool '${tool}' not found` }
      });
      break;
    }

    default:
      send({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method '${method}' not found` }
      });
  }
});
