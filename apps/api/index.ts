import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

app.get('/health' , (c) => c.json({ status: 'healthy', timestamp : new Date().toISOString() }, 200))

serve({fetch : app.fetch , port:3001} , (info) => {
  console.log(`API Server is running on http://localhost:${info.port}`)
})