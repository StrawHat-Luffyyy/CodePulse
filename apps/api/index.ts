import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import {env} from '@codepulse/config'

const app = new Hono()

app.get('/health' , (c) => c.json({
  status : 'ok',
  environment : env.NODE_ENV,
  timestamp: new Date().toISOString()
}) )

serve({fetch : app.fetch , port:env.PORT} , (info) => {
  console.log(`API Server is running on http://localhost:${info.port}`)
})