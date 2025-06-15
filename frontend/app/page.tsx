"use client"

import { MCPServer } from "@/components/ToolsModal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from "@/context/ThemeContext"
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  DollarSign,
  Globe,
  Moon,
  Rocket,
  Server,
  Shield,
  Sparkles,
  Sun,
  PenToolIcon as Tool,
  TrendingUp,
  Users,
  Zap
} from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"

// API response types
interface APITool {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  isMonetized: boolean;
  payment: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface APIServer {
  id: string;
  serverId: string;
  name: string;
  receiverAddress: string;
  description: string;
  metadata?: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
  tools: APITool[];
}

interface AnalyticsData {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  averageExecutionTime: number;
  totalRevenue: number;
  totalPayments: number;
  averagePaymentValue: number;
  totalServers: number;
  activeServers: number;
  totalTools: number;
  monetizedTools: number;
  uniqueUsers: number;
  totalProofs: number;
  consistentProofs: number;
  consistencyRate: number;
  topToolsByRequests: Array<{
    id: string;
    name: string;
    requests: number;
    revenue: number;
  }>;
  topToolsByRevenue: Array<{
    id: string;
    name: string;
    requests: number;
    revenue: number;
  }>;
  dailyActivity: Array<{
    date: string;
    requests: number;
    revenue: number;
    uniqueUsers: number;
  }>;
}

const transformServerData = (apiServer: APIServer): MCPServer => ({
  id: apiServer.serverId,
  name: apiServer.name || 'Unknown Server',
  description: apiServer.description || 'No description available',
  url: apiServer.receiverAddress,
  category: (apiServer.metadata as Record<string, unknown>)?.category as string || 'General',
  icon: <TrendingUp className="h-6 w-6" />,
  verified: apiServer.status === 'active',
  tools: apiServer.tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: (tool.inputSchema as any)?.type || "object",
      properties: (tool.inputSchema as any)?.properties || {}
    },
    annotations: {
      title: tool.name,
      readOnlyHint: !tool.isMonetized,
      destructiveHint: false,
    },
  })),
});

const categories = [
  "All", "General", "Finance", "Automation", "Database", 
  "Development", "Productivity", "Utilities", "Communication", "AI/ML"
]

export default function MCPBrowser() {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const { isDark, toggleTheme } = useTheme()

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(true)
        setAnalyticsError(null)
        
        const analyticsResponse = await fetch('https://api.mcpay.fun/api/analytics/usage')
        if (!analyticsResponse.ok) {
          throw new Error(`Failed to fetch analytics: ${analyticsResponse.status}`)
        }
        
        const analyticsData: AnalyticsData = await analyticsResponse.json()
        setAnalytics(analyticsData)
      } catch (err) {
        setAnalyticsError(err instanceof Error ? err.message : 'Failed to fetch analytics')
      } finally {
        setAnalyticsLoading(false)
      }
    }

    const fetchServers = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const serversResponse = await fetch('https://api.mcpay.fun/api/servers?limit=50&type=trending')
        if (!serversResponse.ok) {
          throw new Error(`Failed to fetch servers: ${serversResponse.status}`)
        }
        
        const servers: APIServer[] = await serversResponse.json()
        const transformedServers = servers.map(server => transformServerData(server))
        
        setMcpServers(transformedServers)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch servers')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
    fetchServers()
  }, [])

  const filteredServers = mcpServers.filter(server => 
    selectedCategory === "All" || server.category === selectedCategory
  )

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)

  // Format number with commas
  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0'
    return num.toLocaleString()
  }

  // Format currency
  const formatCurrency = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '$0.00'
    return `$${num.toFixed(2)}`
  }

  // Enhanced stats card component with original color scheme
  const StatsCard = ({ 
    title, 
    value, 
    icon: Icon, 
    subtitle, 
    trend,
    delay = 0
  }: { 
    title: string
    value: string | number
    icon: any
    subtitle?: string
    trend?: string
    delay?: number
  }) => (
    <Card className={`group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 ${
      isDark ? "bg-gray-800/50 backdrop-blur" : "bg-white/80 backdrop-blur"
    }`} style={{ animationDelay: `${delay}ms` }}>
      {/* Subtle background */}
      <div className={`absolute inset-0 ${isDark ? "bg-blue-900/5" : "bg-blue-50/50"} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      {/* Content */}
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${isDark ? "bg-blue-900/20" : "bg-blue-50"} shadow-lg`}>
            <Icon className={`h-6 w-6 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
          </div>
          {trend && (
            <div className={`flex items-center text-sm font-medium px-2 py-1 rounded-full ${
              trend.startsWith('+') 
                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' 
                : trend.startsWith('-') 
                ? 'text-red-600 bg-red-50 dark:bg-red-900/20' 
                : 'text-gray-600 bg-gray-50 dark:bg-gray-700'
            }`}>
              <TrendingUp className="h-3 w-3 mr-1" />
              {trend}
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {title}
          </p>
          <p className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            {value}
          </p>
          {subtitle && (
            <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      {/* Hover effect */}
      <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-lg" />
    </Card>
  )

  // Enhanced stats skeleton component
  const StatsSkeleton = ({ delay = 0 }: { delay?: number }) => (
    <Card className={`overflow-hidden border-0 shadow-lg ${
      isDark ? "bg-gray-800/50 backdrop-blur" : "bg-white/80 backdrop-blur"
    }`} style={{ animationDelay: `${delay}ms` }}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
            <div className="h-6 w-6" />
          </div>
          <div className={`h-6 w-12 rounded-full animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
        </div>
        <div className="space-y-2">
          <div className={`h-4 rounded animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-200"}`} style={{ width: '60%' }} />
          <div className={`h-8 rounded animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-200"}`} style={{ width: '40%' }} />
          <div className={`h-3 rounded animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-200"}`} style={{ width: '80%' }} />
        </div>
      </div>
    </Card>
  )

  // Enhanced skeleton card component
  const SkeletonCard = ({ delay = 0 }: { delay?: number }) => (
    <Card className={`overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${
      isDark ? "bg-gray-800/50 backdrop-blur" : "bg-white/90 backdrop-blur"
    }`} style={{ animationDelay: `${delay}ms` }}>
      <CardHeader className="pb-4 relative">
        <div className="absolute top-4 right-4">
          <div className={`h-5 w-16 rounded-full animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
        </div>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl w-14 h-14 animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
          <div className="flex-1 space-y-3">
            <div className={`h-6 rounded animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-200"}`} style={{ width: '70%' }} />
            <div className={`h-4 rounded animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-200"}`} style={{ width: '50%' }} />
          </div>
        </div>
        <div className="space-y-2 mt-4">
          <div className={`h-4 rounded animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
          <div className={`h-4 rounded animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-200"}`} style={{ width: '85%' }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className={`h-4 rounded animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-200"}`} style={{ width: '30%' }} />
          <div className={`h-10 rounded-lg animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
        </div>
        <div className="space-y-2">
          <div className={`h-4 rounded animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-200"}`} style={{ width: '50%' }} />
          <div className={`h-10 rounded-lg animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
        </div>
        <div className={`h-12 rounded-lg animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
      </CardContent>
    </Card>
  )

  // Error state
  if (error) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" : "bg-gradient-to-br from-gray-50 via-white to-gray-100"}`}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20 w-fit mx-auto mb-6">
                <AlertCircle className={`h-12 w-12 ${isDark ? "text-red-400" : "text-red-500"}`} />
              </div>
              <h3 className="text-2xl font-bold mb-2">Oops! Something went wrong</h3>
              <p className={`mb-6 text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>{error}</p>
              <Button onClick={() => window.location.reload()} size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600">
                <Rocket className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" : "bg-gradient-to-br from-gray-50 via-white to-gray-100"}`}>
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob ${isDark ? "bg-purple-500" : "bg-purple-300"}`} />
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000 ${isDark ? "bg-blue-500" : "bg-blue-300"}`} />
        <div className={`absolute top-40 left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000 ${isDark ? "bg-pink-500" : "bg-pink-300"}`} />
      </div>

      <div className="relative container mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="text-center mb-16 relative">          
          <div className="flex justify-center mb-6 animate-fade-in-up">
            <Image 
              src="/mcpay-logo.svg" 
              alt="MCPay Logo" 
              width={200} 
              height={200}
              className="drop-shadow-lg"
            />
          </div>
          <div className={`h-1 w-32 ${isDark ? "bg-blue-400" : "bg-blue-600"} mx-auto mb-6 rounded-full`} />
          
          <p className={`text-xl max-w-4xl mx-auto leading-relaxed animate-fade-in-up animation-delay-300 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Transform your AI capabilities with monetizable MCP servers. Connect, extend, and earn through the x402 protocol.
          </p>
          
          <div className="flex items-center justify-center gap-6 mt-8 animate-fade-in-up animation-delay-500">
            <Button 
              size="lg" 
              className={`${isDark ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-600 hover:bg-blue-700"} text-white shadow-lg hover:shadow-xl transition-all duration-300`}
              onClick={() => {
                // Scroll to servers section
                document.querySelector('#servers-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Rocket className="h-5 w-5 mr-2" />
              Get Started
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-2 hover:bg-blue-50 dark:hover:bg-blue-950/50"
              onClick={() => {
                window.open('https://modelcontextprotocol.io', '_blank');
              }}
            >
              <Globe className="h-5 w-5 mr-2" />
              Learn More
            </Button>
          </div>
        </div>

        {/* Enhanced Platform Stats */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className={`text-4xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Platform at a Glance
            </h2>
            <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Real-time metrics from our growing ecosystem
            </p>
          </div>
          
          {analyticsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <StatsSkeleton key={`stats-skeleton-${index}`} delay={index * 100} />
              ))}
            </div>
          ) : analyticsError ? (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20 w-fit mx-auto mb-6">
                <AlertCircle className={`h-12 w-12 ${isDark ? "text-red-400" : "text-red-500"}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Unable to load statistics</h3>
              <p className={`text-sm ${isDark ? "text-red-400" : "text-red-500"}`}>
                We&apos;re working to restore the data feed
              </p>
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Active Servers"
                value={formatNumber(analytics.totalServers)}
                icon={Server}
                subtitle={`${analytics.activeServers} online now`}
                delay={0}
              />
              <StatsCard
                title="Available Tools"
                value={formatNumber(analytics.totalTools)}
                icon={Tool}
                subtitle={`${analytics.monetizedTools} monetized`}
                delay={100}
              />
              <StatsCard
                title="Total Requests"
                value={formatNumber(analytics.totalRequests)}
                icon={Activity}
                subtitle={`${analytics.successRate}% success rate`}
                delay={200}
              />
              <StatsCard
                title="Active Developers"
                value={formatNumber(analytics.uniqueUsers)}
                icon={Users}
                subtitle="Building the future"
                delay={300}
              />
              <StatsCard
                title="Revenue Generated"
                value={formatCurrency(analytics.totalRevenue)}
                icon={DollarSign}
                subtitle={`${formatNumber(analytics.totalPayments)} transactions`}
                delay={400}
              />
              <StatsCard
                title="Lightning Fast"
                value={`${analytics.averageExecutionTime}ms`}
                icon={Zap}
                subtitle="Average response time"
                delay={500}
              />
              <StatsCard
                title="Trust & Security"
                value={formatNumber(analytics.totalProofs)}
                icon={Shield}
                subtitle={`${analytics.consistencyRate}% consistency`}
                delay={600}
              />
              <StatsCard
                title="Value per Call"
                value={formatCurrency(analytics.averagePaymentValue)}
                icon={BarChart3}
                subtitle="Average transaction"
                delay={700}
              />
            </div>
          ) : null}
        </div>

        {/* Enhanced Category Filter */}
        <div className="flex justify-center mb-12">
          <div className="flex gap-2 flex-wrap p-2 rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur shadow-lg border border-white/20 dark:border-gray-700/20">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "ghost"}
                onClick={() => setSelectedCategory(category)}
                size="sm"
                disabled={loading}
                className={selectedCategory === category 
                  ? `${isDark ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-600 hover:bg-blue-700"} text-white shadow-lg` 
                  : "hover:bg-white/70 dark:hover:bg-gray-700/70"
                }
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Enhanced Browse Servers Section */}
        <div className="mb-12" id="servers-section">
          <div className="text-center mb-12">
            <h2 className={`text-4xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Discover MCP Servers
            </h2>
            <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Explore powerful tools and services from our community
            </p>
          </div>
        </div>

        {/* Results Count with better styling */}
        <div className="mb-8 flex items-center justify-between">
          {loading ? (
            <div className={`h-6 w-48 rounded-full animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
          ) : error ? (
            <div className="flex items-center gap-2">
              <AlertCircle className={`h-5 w-5 ${isDark ? "text-red-400" : "text-red-500"}`} />
              <p className={`font-medium ${isDark ? "text-red-400" : "text-red-500"}`}>Failed to load servers</p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <p className={`text-lg font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {filteredServers.length} server{filteredServers.length !== 1 ? "s" : ""} available
              </p>
            </div>
          )}
          
          <Button variant="outline" size="sm" onClick={toggleTheme} className="flex items-center gap-2 backdrop-blur bg-white/50 dark:bg-gray-800/50">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? "Light" : "Dark"}
          </Button>
        </div>

        {/* Enhanced MCP Server Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={`skeleton-${index}`} delay={index * 100} />
            ))
          ) : error ? (
            <div className="col-span-full text-center py-16">
              <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-900/20 w-fit mx-auto mb-6">
                <AlertCircle className={`h-16 w-16 ${isDark ? "text-red-400" : "text-red-500"}`} />
              </div>
              <h3 className="text-2xl font-bold mb-4">Connection Lost</h3>
              <p className={`mb-6 text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Unable to fetch MCP servers at the moment
              </p>
              <Button onClick={() => window.location.reload()} size="lg" className={`${isDark ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-600 hover:bg-blue-700"} text-white`}>
                <Rocket className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="p-6 rounded-2xl bg-gray-100 dark:bg-gray-800 w-fit mx-auto mb-6">
                <Globe className={`h-16 w-16 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
              </div>
              <h3 className="text-2xl font-bold mb-4">No Servers Found</h3>
              <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {mcpServers.length === 0 ? "Be the first to register a server!" : "Try exploring a different category."}
              </p>
            </div>
          ) : (
            filteredServers.map((server, index) => (
              <Card key={server.id} className={`group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 animate-fade-in-up ${
                isDark ? "bg-gray-800/60 backdrop-blur" : "bg-white/80 backdrop-blur"
              }`} style={{ animationDelay: `${index * 100}ms` }}>
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <CardHeader className="pb-4 relative">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${isDark ? "bg-blue-900/20" : "bg-blue-50"} shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                      {server.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-300">
                        {server.name}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                        {server.category}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardDescription className="text-sm leading-relaxed mt-4 h-12 line-clamp-2">
                    {server.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Enhanced URL section */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      MCP Connection URL
                    </label>
                    <div className="flex items-center gap-2">
                      <code className={`flex-1 text-xs p-3 rounded-lg font-mono break-all transition-colors duration-200 ${
                        isDark ? "bg-gray-700/50 border border-gray-600/50 hover:bg-gray-700" : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                      }`}>
                        {`https://api.mcpay.fun/mcp/${server.id}`}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          copyToClipboard(`https://api.mcpay.fun/mcp/${server.id}`);
                        }}
                        className="shrink-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>

                  {/* Enhanced tools section */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Tool className="h-4 w-4" />
                      Available Tools
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {server.tools.length}
                      </Badge>
                    </label>
                  </div>

                  {/* Enhanced action button */}
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.location.href = `/servers/${server.id}`;
                    }}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                </CardContent>

                {/* Shine effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform translate-x-full group-hover:-translate-x-full transition-transform duration-1000" />
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Enhanced Footer */}
        <div className={`text-center py-12 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              <p className={`text-lg ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                Powered by the <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Model Context Protocol</a> and <a href="https://x402.org" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">x402</a>
              </p>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <button
                onClick={() => window.open('https://modelcontextprotocol.io', '_blank')}
                className={`hover:text-blue-500 transition-colors duration-200 ${isDark ? "text-gray-400" : "text-gray-500"} cursor-pointer`}
              >
                Learn about MCP
              </button>
              <span className={isDark ? "text-gray-600" : "text-gray-400"}>•</span>
              <button
                onClick={() => {
                  // You can add API documentation link here
                  console.log('API Documentation clicked');
                }}
                className={`hover:text-blue-500 transition-colors duration-200 ${isDark ? "text-gray-400" : "text-gray-500"} cursor-pointer`}
              >
                API Documentation
              </button>
              <span className={isDark ? "text-gray-600" : "text-gray-400"}>•</span>
              <button
                onClick={() => {
                  // You can add developer guide link here
                  console.log('Developer Guide clicked');
                }}
                className={`hover:text-blue-500 transition-colors duration-200 ${isDark ? "text-gray-400" : "text-gray-500"} cursor-pointer`}
              >
                Developer Guide
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-300 {
          animation-delay: 300ms;
        }

        .animation-delay-500 {
          animation-delay: 500ms;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
