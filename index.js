import ollama from 'ollama'
const userQuery = "climate in hyderabad";



const tools = [
    {
        type: 'function',
        function: {
            name: 'get_weather',
            description: 'Get the current weather in a given location',
            parameters: {
                type: 'object',
                required: ['city'],
                properties: {
                    city: { type: 'string', description: 'The name of the city' },
                },
            },
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_time',
            description: 'Get the current time in a given location',
            parameters: {
                type: 'object',
                required: ['city'],
                properties: {
                    city: { type: 'string', description: 'time in the city' },
                },
            },
        }
    }
]

const get_weather = async (city) => {
    return {
        temperature: '30°C',
        condition: 'Sunny',
        city: city
    }
}

const get_time = async (city) => {
    return {
        time: new Date().toLocaleTimeString(),
        city: city
    }
}

async function run() {
    const response = await ollama.chat({
        model: 'qwen2.5:7b',
        messages: [{ role: 'user', content: userQuery }],
        tools: tools
    })

    const toolResults = [];

    if (response.message.tool_calls && response.message.tool_calls.length > 0) {
        for (const call of response.message.tool_calls) {

            console.log('Tool:', call.function.name);

            let result;

            if (call.function.name === 'get_weather') {
                result = await get_weather(call.function.arguments.city);
            }

            else if (call.function.name === 'get_time') {
                result = await get_time(call.function.arguments.city);
            }

            toolResults.push({
                tool: call.function.name,
                result
            });
        }
    } else {
        console.log(response.message.content);
    }

    const finalResponse = await ollama.chat({
        model: 'qwen2.5:7b',
        messages: [{ role: 'user', content: userQuery },
        { role: 'tool', content: JSON.stringify(toolResults) }
        ]
    })
    console.log(finalResponse.message.content)
}

run()
