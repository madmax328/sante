import { Tabs } from "expo-router";
import { CalendarDays, Dumbbell, House, NotebookPen, ShoppingBasket } from "lucide-react-native";
import { useColors } from "@/lib/theme";

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.basilic,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        tabBarLabelStyle: { fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Aujourd'hui", tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
      <Tabs.Screen name="week" options={{ title: "Semaine", tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> }} />
      <Tabs.Screen name="groceries" options={{ title: "Courses", tabBarIcon: ({ color, size }) => <ShoppingBasket color={color} size={size} /> }} />
      <Tabs.Screen name="journal" options={{ title: "Journal", tabBarIcon: ({ color, size }) => <NotebookPen color={color} size={size} /> }} />
      <Tabs.Screen name="sport" options={{ title: "Sport", tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} /> }} />
    </Tabs>
  );
}
