import {
  Client,
  StreamableHTTPClientTransport
} from "@modelcontextprotocol/client";

async function connectToServer(name, url) {
  const client = new Client({
    name: `${name}-client`,
    version: "1.0.0"
  });

  const transport = new StreamableHTTPClientTransport(
    new URL(url)
  );

  await client.connect(transport);

  console.log(`Connected to ${name}`);

  return client;
}

async function main() {
  // --------------------------------------------------
  // 1. Connect to Weather MCP server
  // --------------------------------------------------

  const weatherClient = await connectToServer(
    "weather",
    "http://127.0.0.1:3001/mcp"
  );

  // --------------------------------------------------
  // 2. Connect to Exchange MCP server
  // --------------------------------------------------

  const exchangeClient = await connectToServer(
    "exchange",
    "http://127.0.0.1:3002/mcp"
  );

  // --------------------------------------------------
  // 3. Discover weather tools
  // --------------------------------------------------

  const weatherTools = await weatherClient.listTools();

  console.log("\nWeather server tools:");

  for (const tool of weatherTools.tools) {
    console.log(`- ${tool.name}`);
  }

  // --------------------------------------------------
  // 4. Discover exchange tools
  // --------------------------------------------------

  const exchangeTools = await exchangeClient.listTools();

  console.log("\nExchange server tools:");

  for (const tool of exchangeTools.tools) {
    console.log(`- ${tool.name}`);
  }

  // --------------------------------------------------
  // 5. Call both servers
  // --------------------------------------------------

  const [weatherResult, exchangeResult] = await Promise.all([
    weatherClient.callTool({
      name: "get_weather",
      arguments: {
        city: "Hyderabad"
      }
    }),

    exchangeClient.callTool({
      name: "get_exchange_rate",
      arguments: {
        from: "USD",
        to: "INR"
      }
    })
  ]);

  // --------------------------------------------------
  // 6. Extract tool responses
  // --------------------------------------------------

  function extractText(result) {
    return (result.content ?? [])
      .filter(block => block.type === "text")
      .map(block => block.text)
      .join("\n");
  }

  const weather = JSON.parse(
    extractText(weatherResult)
  );

  const exchangeRate = JSON.parse(
    extractText(exchangeResult)
  );

  // --------------------------------------------------
  // 7. Combine results
  // --------------------------------------------------

  console.log("\nCombined data:");

  console.log(
    `Weather: ${weather.city} - ` +
    `${weather.temperature}°${weather.unit}, ` +
    `${weather.condition}`
  );

  console.log(
    `Exchange: 1 ${exchangeRate.from} = ` +
    `${exchangeRate.rate} ${exchangeRate.to}`
  );

  // --------------------------------------------------
  // 8. Close both connections
  // --------------------------------------------------

  await weatherClient.close();
  await exchangeClient.close();
}

main().catch(error => {
  console.error("\nClient error:", error);
  process.exit(1);
});