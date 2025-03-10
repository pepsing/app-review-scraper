"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { updateApp } from "@/lib/actions"
import type { App } from "@/lib/types"

export default function EditAppPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [app, setApp] = useState<App | null>(null)

  const [appName, setAppName] = useState("")
  const [appIcon, setAppIcon] = useState("")
  const [appStoreEnabled, setAppStoreEnabled] = useState(true)
  const [playStoreEnabled, setPlayStoreEnabled] = useState(true)
  const [appStoreId, setAppStoreId] = useState("")
  const [playStoreId, setPlayStoreId] = useState("")
  const [appStoreRegions, setAppStoreRegions] = useState<string[]>(["US"])
  const [playStoreRegions, setPlayStoreRegions] = useState<string[]>(["US"])
  const [appStoreFrequency, setAppStoreFrequency] = useState("daily")
  const [playStoreFrequency, setPlayStoreFrequency] = useState("daily")
  const [newRegion, setNewRegion] = useState("")

  useEffect(() => {
    async function loadApp() {
      try {
        const response = await fetch(`/api/apps/${params.id}`)
        if (!response.ok) throw new Error('Failed to fetch app')
        const app = await response.json()
        setApp(app)
        
        // 设置表单初始值
        setAppName(app.name)
        setAppIcon(app.icon || "")
        setAppStoreEnabled(!!app.appStoreId)
        setPlayStoreEnabled(!!app.playStoreId)
        setAppStoreId(app.appStoreId || "")
        setPlayStoreId(app.playStoreId || "")
        setAppStoreRegions(app.appStoreRegions)
        setPlayStoreRegions(app.playStoreRegions)
        setAppStoreFrequency(app.appStoreFrequency || "daily")
        setPlayStoreFrequency(app.playStoreFrequency || "daily")
      } catch (error) {
        console.error('Error loading app:', error)
        toast({
          title: "Error",
          description: "Failed to load app",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadApp()
  }, [params.id])

  const addRegion = (store: "appStore" | "playStore") => {
    if (!newRegion) return

    if (store === "appStore") {
      if (!appStoreRegions.includes(newRegion)) {
        setAppStoreRegions([...appStoreRegions, newRegion])
      }
    } else {
      if (!playStoreRegions.includes(newRegion)) {
        setPlayStoreRegions([...playStoreRegions, newRegion])
      }
    }
    setNewRegion("")
  }

  const removeRegion = (store: "appStore" | "playStore", region: string) => {
    if (store === "appStore") {
      setAppStoreRegions(appStoreRegions.filter((r) => r !== region))
    } else {
      setPlayStoreRegions(playStoreRegions.filter((r) => r !== region))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!app) return

    if (!appName) {
      toast({
        title: "Error",
        description: "App name is required",
        variant: "destructive",
      })
      return
    }

    if (!appStoreEnabled && !playStoreEnabled) {
      toast({
        title: "Error",
        description: "At least one store must be enabled",
        variant: "destructive",
      })
      return
    }

    if (appStoreEnabled && !appStoreId) {
      toast({
        title: "Error",
        description: "App Store ID is required",
        variant: "destructive",
      })
      return
    }

    if (playStoreEnabled && !playStoreId) {
      toast({
        title: "Error",
        description: "Play Store ID is required",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      const updatedApp = {
        ...app,
        name: appName,
        icon: appIcon,
        appStoreId: appStoreEnabled ? appStoreId : null,
        playStoreId: playStoreEnabled ? playStoreId : null,
        appStoreRegions: appStoreEnabled ? appStoreRegions : [],
        playStoreRegions: playStoreEnabled ? playStoreRegions : [],
        appStoreFrequency: appStoreEnabled ? appStoreFrequency : null,
        playStoreFrequency: playStoreEnabled ? playStoreFrequency : null,
      }

      await updateApp(updatedApp)

      toast({
        title: "Success",
        description: "App updated successfully",
      })

      router.push(`/apps/${app.id}`)
      router.refresh()
    } catch (error) {
      console.error("Error updating app:", error)
      toast({
        title: "Error",
        description: "Failed to update app",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Link href={`/apps/${params.id}`} className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Loading...</h1>
        </div>
      </div>
    )
  }

  if (!app) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Link href="/" className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">App Not Found</h1>
        </div>
        <p>The requested app could not be found.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Link href={`/apps/${params.id}`} className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit {app.name}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>App Details</CardTitle>
            <CardDescription>Update the app configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="app-name">App Name</Label>
                <Input
                  id="app-name"
                  placeholder="Enter app name"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-icon">App Icon URL (optional)</Label>
                <Input
                  id="app-icon"
                  placeholder="https://example.com/app-icon.png"
                  value={appIcon}
                  onChange={(e) => setAppIcon(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Stores</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch id="app-store" checked={appStoreEnabled} onCheckedChange={setAppStoreEnabled} />
                  <Label htmlFor="app-store">App Store</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="play-store" checked={playStoreEnabled} onCheckedChange={setPlayStoreEnabled} />
                  <Label htmlFor="play-store">Google Play Store</Label>
                </div>
              </div>
            </div>

            <Tabs defaultValue="app-store" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="app-store" disabled={!appStoreEnabled}>
                  App Store
                </TabsTrigger>
                <TabsTrigger value="play-store" disabled={!playStoreEnabled}>
                  Play Store
                </TabsTrigger>
              </TabsList>
              <TabsContent value="app-store" className="space-y-4">
                <div className="space-y-2 mt-4">
                  <Label htmlFor="app-store-id">App Store ID</Label>
                  <Input
                    id="app-store-id"
                    placeholder="123456789"
                    value={appStoreId}
                    onChange={(e) => setAppStoreId(e.target.value)}
                    disabled={!appStoreEnabled}
                    required={appStoreEnabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Regions</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {appStoreRegions.map((region) => (
                      <Badge key={region} variant="secondary" className="flex items-center gap-1">
                        {region}
                        <button
                          type="button"
                          onClick={() => removeRegion("appStore", region)}
                          className="ml-1 rounded-full hover:bg-muted p-0.5"
                          disabled={!appStoreEnabled}
                        >
                          <span className="sr-only">Remove {region}</span>
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add region (e.g. US, GB)"
                      value={newRegion}
                      onChange={(e) => setNewRegion(e.target.value.toUpperCase())}
                      disabled={!appStoreEnabled}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addRegion("appStore")}
                      disabled={!appStoreEnabled || !newRegion}
                    >
                      Add
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Update Frequency</Label>
                  <RadioGroup
                    value={appStoreFrequency}
                    onValueChange={setAppStoreFrequency}
                    disabled={!appStoreEnabled}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="daily" id="app-store-daily" />
                      <Label htmlFor="app-store-daily">Daily</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="weekly" id="app-store-weekly" />
                      <Label htmlFor="app-store-weekly">Weekly</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="monthly" id="app-store-monthly" />
                      <Label htmlFor="app-store-monthly">Monthly</Label>
                    </div>
                  </RadioGroup>
                </div>
              </TabsContent>
              <TabsContent value="play-store" className="space-y-4">
                <div className="space-y-2 mt-4">
                  <Label htmlFor="play-store-id">Play Store Package Name</Label>
                  <Input
                    id="play-store-id"
                    placeholder="com.example.app"
                    value={playStoreId}
                    onChange={(e) => setPlayStoreId(e.target.value)}
                    disabled={!playStoreEnabled}
                    required={playStoreEnabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Regions</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {playStoreRegions.map((region) => (
                      <Badge key={region} variant="secondary" className="flex items-center gap-1">
                        {region}
                        <button
                          type="button"
                          onClick={() => removeRegion("playStore", region)}
                          className="ml-1 rounded-full hover:bg-muted p-0.5"
                          disabled={!playStoreEnabled}
                        >
                          <span className="sr-only">Remove {region}</span>
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add region (e.g. US, GB)"
                      value={newRegion}
                      onChange={(e) => setNewRegion(e.target.value.toUpperCase())}
                      disabled={!playStoreEnabled}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addRegion("playStore")}
                      disabled={!playStoreEnabled || !newRegion}
                    >
                      Add
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Update Frequency</Label>
                  <RadioGroup
                    value={playStoreFrequency}
                    onValueChange={setPlayStoreFrequency}
                    disabled={!playStoreEnabled}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="daily" id="play-store-daily" />
                      <Label htmlFor="play-store-daily">Daily</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="weekly" id="play-store-weekly" />
                      <Label htmlFor="play-store-weekly">Weekly</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="monthly" id="play-store-monthly" />
                      <Label htmlFor="play-store-monthly">Monthly</Label>
                    </div>
                  </RadioGroup>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href={`/apps/${params.id}`}>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
} 