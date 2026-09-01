import { createRouter, createWebHistory } from 'vue-router'
import { useWorkspace } from '@/composables/useWorkspace'

/** Reachable without a workspace. Everything else redirects to registration. */
const PUBLIC_ROUTES = ['/', '/register', '/signin', '/signup']

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { left: 0, top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/HomePage.vue'),
      meta: {
        title: 'Home',
      },
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('../views/planner/DashboardPage.vue'),
      meta: {
        title: 'Dashboard',
      },
    },
    {
      path: '/board',
      name: 'Board',
      component: () => import('../views/planner/BoardPage.vue'),
      meta: {
        title: 'Board',
      },
    },
    {
      path: '/backlog',
      name: 'Backlog',
      component: () => import('../views/planner/BacklogPage.vue'),
      meta: {
        title: 'Backlog',
      },
    },
    {
      path: '/timeline',
      name: 'Timeline',
      component: () => import('../views/planner/TimelinePage.vue'),
      meta: {
        title: 'Timeline',
      },
    },
    {
      path: '/issues',
      name: 'Issues',
      component: () => import('../views/planner/IssuesPage.vue'),
      meta: {
        title: 'Issues',
      },
    },
    {
      path: '/schedule',
      name: 'Schedule',
      component: () => import('../views/planner/SchedulePage.vue'),
      meta: {
        title: 'Schedule',
      },
    },
    {
      path: '/reports',
      name: 'Reports',
      component: () => import('../views/planner/ReportsPage.vue'),
      meta: {
        title: 'Reports',
      },
    },
    {
      path: '/team',
      name: 'Team',
      component: () => import('../views/Team/TeamPage.vue'),
      meta: {
        title: 'Team',
      },
    },
    {
      path: '/team/:id',
      name: 'Member profile',
      component: () => import('../views/Team/MemberProfilePage.vue'),
      meta: {
        title: 'Member profile',
      },
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('../views/Team/MemberProfilePage.vue'),
      meta: {
        title: 'My profile',
      },
    },
    {
      path: '/settings/appearance',
      name: 'Appearance',
      component: () => import('../views/Settings/AppearanceSettings.vue'),
      meta: {
        title: 'Appearance',
      },
    },
    {
      path: '/settings/company',
      name: 'Company settings',
      component: () => import('../views/Settings/CompanySettings.vue'),
      meta: {
        title: 'Company settings',
      },
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('../views/Auth/RegisterCompany.vue'),
      meta: {
        title: 'Create your workspace',
      },
    },
    {
      path: '/signin',
      name: 'Signin',
      component: () => import('../views/Auth/Signin.vue'),
      meta: {
        title: 'Sign In',
      },
    },
    {
      path: '/signup',
      name: 'Signup',
      component: () => import('../views/Auth/Signup.vue'),
      meta: {
        title: 'Sign Up',
      },
    },
    {
      path: '/:pathMatch(.*)*',
      name: '404 Error',
      component: () => import('../views/Errors/FourZeroFour.vue'),
      meta: {
        title: '404 Error',
      },
    },
  ],
})

export default router

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title} | Zetoo — Sprint & Time Planning`

  const { isRegistered } = useWorkspace()

  // No workspace yet: every planning screen funnels into registration.
  if (!isRegistered.value && !PUBLIC_ROUTES.includes(to.path)) {
    next({ path: '/register' })
    return
  }

  // Registered users have no reason to see the wizard again.
  if (isRegistered.value && to.path === '/register') {
    next({ path: '/dashboard' })
    return
  }

  next()
})
