"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CreditCard, TrendingUp } from "lucide-react"
import meetingPng from "../../../assets/meeting.png"

// Composant d'icône personnalisée pour remplacer Wallet
const CustomWalletIcon = ({ className }: { className?: string }) => (
  <div className={`inline-flex items-center justify-center ${className}`}>
    <img 
      src={meetingPng}
      alt="Fonds" 
      className="h-4 w-4 object-cover rounded-sm"
    />
  </div>
)

export function Dashboard() {
  const stats = [
    {
      title: "Total des Fonds",
      value: "125,430,000 FCFA",
      icon: CustomWalletIcon,
      color: "blue",
      change: "+12.5%",
    },
    {
      title: "Nombre de Membres",
      value: "24",
      icon: Users,
      color: "blue",
      change: "+2",
    },
    {
      title: "Crédits Actifs",
      value: "8",
      icon: CreditCard,
      color: "red",
      change: "-1",
    },
    {
      title: "Solde Disponible",
      value: "45,230,000 FCFA",
      icon: TrendingUp,
      color: "blue",
      change: "+8.2%",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-2">Vue d'ensemble de votre fonds familial</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className={`border-l-4 ${
              stat.color === "blue"
                ? "border-l-blue-500 hover:shadow-blue-100"
                : "border-l-red-500 hover:shadow-red-100"
            } hover:shadow-lg transition-shadow`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color === "blue" ? "text-blue-600" : "text-red-600"}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <p className={`text-xs ${stat.change.startsWith("+") ? "text-green-600" : "text-red-600"}`}>
                {stat.change} depuis le mois dernier
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900">Activité Récente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Marie Dubois", action: "Épargne", amount: "+500,000 FCFA", time: "Il y a 2h" },
                { name: "Jean Martin", action: "Crédit", amount: "-2,000,000 FCFA", time: "Il y a 5h" },
                { name: "Sophie Laurent", action: "Épargne", amount: "+300,000 FCFA", time: "Hier" },
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">{activity.name}</p>
                    <p className="text-sm text-slate-600">{activity.action}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${activity.amount.startsWith("+") ? "text-green-600" : "text-red-600"}`}>
                      {activity.amount}
                    </p>
                    <p className="text-sm text-slate-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900">Répartition des Fonds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Épargnes</span>
                  <span className="font-medium">80,200,000 FCFA (64%)</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: "64%" }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Crédits en cours</span>
                  <span className="font-medium">45,230,000 FCFA (36%)</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: "36%" }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
