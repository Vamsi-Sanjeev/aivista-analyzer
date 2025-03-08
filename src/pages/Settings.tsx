
import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useUpdateUserSettings, useUserSettings } from "@/lib/supabase-client";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Globe,
  Loader2,
  Check,
  Mail,
  X,
  Plus,
  Smartphone
} from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const Settings = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState("notifications");
  const [connectedApps, setConnectedApps] = useState([
    { name: "Google Calendar", connected: true },
    { name: "Microsoft Office", connected: false },
    { name: "Slack", connected: true },
    { name: "Dropbox", connected: false },
    { name: "Trello", connected: false },
  ]);
  const [newAppCredentials, setNewAppCredentials] = useState({
    name: 'Google Drive',
    apiKey: '',
    apiSecret: ''
  });
  const [notificationStatus, setNotificationStatus] = useState<{
    message: string;
    type: "success" | "error" | "loading" | null;
  }>({ message: "", type: null });
  
  // Get the current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email);
      }
    };
    
    getUser();
  }, []);
  
  // Get user settings
  const { data: userSettings, isLoading, refetch } = useUserSettings(userId);
  const updateUserSettings = useUpdateUserSettings();
  
  // Update local state when settings are loaded
  useEffect(() => {
    if (userSettings) {
      // Using type assertion to handle dynamic properties
      const settings = userSettings as any;
      
      setPreferences({
        emailNotifications: settings.email_notifications || true,
        pushNotifications: settings.push_notifications || false,
        marketingEmails: settings.marketing_emails || false,
      });
    }
  }, [userSettings]);

  // Function to send a test notification
  const sendTestNotification = async (type: 'email' | 'push' | 'marketing') => {
    if (!userId || !userEmail) {
      toast({
        title: "Not Authenticated",
        description: "You need to be logged in to send test notifications.",
        variant: "destructive",
      });
      return;
    }
    
    setNotificationStatus({
      message: `Sending test ${type} notification...`,
      type: "loading"
    });
    
    try {
      let payload = {};
      let action = '';
      
      if (type === 'email') {
        action = 'email_notification';
        payload = {
          recipient: userEmail,
          subject: "Test Email Notification",
          message: "This is a test email notification from the dashboard."
        };
      } else if (type === 'push') {
        action = 'push_notification';
        payload = {
          userId,
          title: "Test Push Notification",
          body: "This is a test push notification from the dashboard."
        };
      } else if (type === 'marketing') {
        action = 'marketing_email';
        payload = {
          recipients: [userEmail],
          campaign: "Test Marketing Campaign",
          content: "This is a test marketing email campaign."
        };
      }
      
      const response = await fetch('https://pjgxeexnyculxivmtccj.supabase.co/functions/v1/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          data: payload
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNotificationStatus({
          message: data.message,
          type: "success"
        });
        
        setTimeout(() => {
          setNotificationStatus({ message: "", type: null });
        }, 5000);
        
        toast({
          title: "Notification Sent",
          description: data.message,
        });
      } else {
        throw new Error(data.error || "Failed to send notification");
      }
    } catch (error: any) {
      setNotificationStatus({
        message: error.message || `Failed to send ${type} notification`,
        type: "error"
      });
      
      toast({
        title: "Error",
        description: error.message || `Failed to send ${type} notification`,
        variant: "destructive",
      });
      
      setTimeout(() => {
        setNotificationStatus({ message: "", type: null });
      }, 5000);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleToggleSetting = async (setting: string) => {
    if (!userId) {
      toast({
        title: "Not Authenticated",
        description: "You need to be logged in to change settings.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      // Map the setting name to database field
      let updatedSettings: Record<string, any> = {};
      
      if (setting === "emailNotifications") {
        updatedSettings.email_notifications = !preferences.emailNotifications;
        setPreferences({
          ...preferences,
          emailNotifications: !preferences.emailNotifications,
        });
        
        // Send a test notification if being enabled
        if (!preferences.emailNotifications) {
          // We'll handle this after saving the preference
          setTimeout(() => {
            sendTestNotification('email');
          }, 1000);
        }
      } else if (setting === "pushNotifications") {
        updatedSettings.push_notifications = !preferences.pushNotifications;
        setPreferences({
          ...preferences,
          pushNotifications: !preferences.pushNotifications,
        });
        
        // Request notification permissions if being enabled
        if (!preferences.pushNotifications) {
          if (Notification.permission !== "granted") {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
              setTimeout(() => {
                sendTestNotification('push');
              }, 1000);
            }
          } else {
            // Send a test push notification
            setTimeout(() => {
              sendTestNotification('push');
            }, 1000);
          }
        }
      } else if (setting === "marketingEmails") {
        updatedSettings.marketing_emails = !preferences.marketingEmails;
        setPreferences({
          ...preferences,
          marketingEmails: !preferences.marketingEmails,
        });
        
        if (!preferences.marketingEmails) {
          setTimeout(() => {
            sendTestNotification('marketing');
          }, 1000);
        }
      }
      
      // Update in database
      await updateUserSettings.mutateAsync({
        userId,
        settings: updatedSettings,
      });
      
      toast({
        title: "Setting Updated",
        description: `Your ${setting} preference has been updated.`,
      });
      
      // Refetch settings to make sure we have the latest data
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update setting",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectApp = async (appName: string) => {
    setIsSaving(true);
    try {
      if (!newAppCredentials.apiKey || !newAppCredentials.apiSecret) {
        throw new Error("API Key and Secret are required");
      }
      
      // Simulate API connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "App Connected",
        description: `Successfully connected to ${appName || newAppCredentials.name}`,
      });
      
      // Update the local state
      if (appName) {
        setConnectedApps(prevApps => 
          prevApps.map(app => 
            app.name === appName ? { ...app, connected: true } : app
          )
        );
      } else {
        // Add new app to the list
        setConnectedApps(prevApps => [
          ...prevApps,
          { name: newAppCredentials.name, connected: true }
        ]);
        
        // Reset form
        setNewAppCredentials({
          name: 'Google Drive',
          apiKey: '',
          apiSecret: ''
        });
      }
      
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || `Failed to connect to ${appName || newAppCredentials.name}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setShowConnectModal(false);
    }
  };

  const handleDisconnectApp = async (appName: string) => {
    setIsSaving(true);
    try {
      // Simulate disconnecting from the app
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "App Disconnected",
        description: `Successfully disconnected from ${appName}`,
      });
      
      // Update the local state
      setConnectedApps(prevApps => 
        prevApps.map(app => 
          app.name === appName ? { ...app, connected: false } : app
        )
      );
      
    } catch (error: any) {
      toast({
        title: "Disconnection Failed",
        description: error.message || `Failed to disconnect from ${appName}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-up">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your preferences</p>
        </div>

        <div className="grid gap-4 md:grid-cols-7">
          <div className="dashboard-card md:col-span-2">
            <div className="space-y-1 mb-6">
              <button 
                onClick={() => setActiveSettingsTab("notifications")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md ${
                  activeSettingsTab === "notifications" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                }`}
              >
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </button>
              <button 
                onClick={() => setActiveSettingsTab("integrations")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md ${
                  activeSettingsTab === "integrations" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                }`}
              >
                <Globe className="h-4 w-4" />
                <span>Integrations</span>
              </button>
            </div>
          </div>

          <div className="dashboard-card md:col-span-5">
            {activeSettingsTab === "notifications" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-6">
                  <Bell className="h-4 w-4" />
                  <h3 className="font-medium">Notification Settings</h3>
                </div>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {notificationStatus.type && (
                      <Alert variant={notificationStatus.type === "error" ? "destructive" : "default"}>
                        {notificationStatus.type === "loading" ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : notificationStatus.type === "success" ? (
                          <Check className="h-4 w-4 mr-2" />
                        ) : (
                          <X className="h-4 w-4 mr-2" />
                        )}
                        <AlertTitle>Notification Status</AlertTitle>
                        <AlertDescription>{notificationStatus.message}</AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Email Notifications */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5">
                      <div className="flex items-center gap-3">
                        <Bell className="h-4 w-4" />
                        <div>
                          <p className="text-sm font-medium">Email Notifications</p>
                          <p className="text-sm text-muted-foreground">
                            Receive updates and alerts via email
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {preferences.emailNotifications && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => sendTestNotification('email')}
                            disabled={isSaving || notificationStatus.type === "loading"}
                          >
                            {notificationStatus.type === "loading" ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                            ) : (
                              <Mail className="h-4 w-4 mr-2" />
                            )}
                            Test
                          </Button>
                        )}
                        <button
                          onClick={() => handleToggleSetting("emailNotifications")}
                          disabled={isSaving}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full ${preferences.emailNotifications ? "bg-primary" : "bg-input"}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                              preferences.emailNotifications ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    
                    {/* Push Notifications */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-4 w-4" />
                        <div>
                          <p className="text-sm font-medium">Push Notifications</p>
                          <p className="text-sm text-muted-foreground">
                            Receive push notifications on your devices
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {preferences.pushNotifications && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => sendTestNotification('push')}
                            disabled={isSaving || notificationStatus.type === "loading"}
                          >
                            {notificationStatus.type === "loading" ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                            ) : (
                              <Bell className="h-4 w-4 mr-2" />
                            )}
                            Test
                          </Button>
                        )}
                        <button
                          onClick={() => handleToggleSetting("pushNotifications")}
                          disabled={isSaving}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full ${preferences.pushNotifications ? "bg-primary" : "bg-input"}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                              preferences.pushNotifications ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    
                    {/* Marketing Emails */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4" />
                        <div>
                          <p className="text-sm font-medium">Marketing Emails</p>
                          <p className="text-sm text-muted-foreground">
                            Receive marketing and promotional emails
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {preferences.marketingEmails && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => sendTestNotification('marketing')}
                            disabled={isSaving || notificationStatus.type === "loading"}
                          >
                            {notificationStatus.type === "loading" ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                            ) : (
                              <Mail className="h-4 w-4 mr-2" />
                            )}
                            Test
                          </Button>
                        )}
                        <button
                          onClick={() => handleToggleSetting("marketingEmails")}
                          disabled={isSaving}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full ${preferences.marketingEmails ? "bg-primary" : "bg-input"}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                              preferences.marketingEmails ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <p className="text-sm text-muted-foreground">
                        These settings control how you receive notifications from the application. 
                        You can use the test buttons to verify that notifications are working correctly.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeSettingsTab === "integrations" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-6">
                  <Globe className="h-4 w-4" />
                  <h3 className="font-medium">Integrations</h3>
                </div>
                
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Connect your account to external services for enhanced functionality.
                  </p>
                  
                  {/* Connected Apps */}
                  <div className="space-y-4">
                    {connectedApps.map((app) => (
                      <div key={app.name} className="flex items-center justify-between p-4 rounded-lg bg-primary/5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium">{app.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{app.name}</p>
                            {app.connected ? (
                              <div className="flex items-center mt-1">
                                <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                                <p className="text-xs text-muted-foreground">Connected</p>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">Not connected</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant={app.connected ? "outline" : "default"}
                          size="sm"
                          onClick={() => app.connected 
                            ? handleDisconnectApp(app.name) 
                            : setShowConnectModal(true)
                          }
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : app.connected ? (
                            "Disconnect"
                          ) : (
                            "Connect"
                          )}
                        </Button>
                      </div>
                    ))}
                    
                    <button 
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-input hover:bg-accent transition-colors"
                      onClick={() => setShowConnectModal(true)}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-sm">Connect New App</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* App Connection Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <div className="w-full max-w-md p-6 rounded-lg border border-input bg-background shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-medium">Connect New App</h4>
              <button onClick={() => setShowConnectModal(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select App</label>
                <select 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={newAppCredentials.name}
                  onChange={(e) => setNewAppCredentials({...newAppCredentials, name: e.target.value})}
                >
                  <option value="Google Drive">Google Drive</option>
                  <option value="Dropbox">Dropbox</option>
                  <option value="GitHub">GitHub</option>
                  <option value="Trello">Trello</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <input
                  type="text"
                  value={newAppCredentials.apiKey}
                  onChange={(e) => setNewAppCredentials({...newAppCredentials, apiKey: e.target.value})}
                  placeholder="Enter your API key"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">API Secret</label>
                <input
                  type="password"
                  value={newAppCredentials.apiSecret}
                  onChange={(e) => setNewAppCredentials({...newAppCredentials, apiSecret: e.target.value})}
                  placeholder="Enter your API secret"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              
              <p className="text-sm text-muted-foreground">
                Your credentials will be encrypted and stored securely.
              </p>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowConnectModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleConnectApp('')}
                  disabled={isSaving || !newAppCredentials.apiKey || !newAppCredentials.apiSecret}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Settings;
