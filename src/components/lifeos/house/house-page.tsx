'use client'

import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  ExternalLink,
  Home,
  Lightbulb,
  Moon,
  Play,
  Power,
  Radio,
  Settings2,
  Sparkles,
  Sun,
  Thermometer,
  Wifi,
  Zap,
} from 'lucide-react'
import { SectionPage } from '@/components/lifeos/shared/section-page'

type Device = {
  id: string
  name: string
  type: 'light' | 'plug' | 'sensor'
  state: boolean
  value?: string
}

type Room = {
  id: string
  name: string
  description: string
  devices: Device[]
}

const initialRooms: Room[] = [
  {
    id: 'living-room',
    name: 'Living room',
    description: 'Lighting, media and atmosphere.',
    devices: [
      { id: 'living-lamp', name: 'Main lamp', type: 'light', state: false },
      { id: 'side-lamp', name: 'Side lamp', type: 'light', state: true },
      { id: 'tv-plug', name: 'TV power', type: 'plug', state: true },
      { id: 'living-temperature', name: 'Temperature', type: 'sensor', state: true, value: '21.4°C' },
    ],
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    description: 'Quiet lighting and evening routines.',
    devices: [
      { id: 'bedside-lamp', name: 'Bedside lamp', type: 'light', state: false },
      { id: 'bedroom-temperature', name: 'Temperature', type: 'sensor', state: true, value: '20.8°C' },
    ],
  },
  {
    id: 'hall',
    name: 'Hall',
    description: 'Arrival, departure and practical automation.',
    devices: [
      { id: 'hall-lamp', name: 'Hall lamp', type: 'light', state: true },
    ],
  },
]

function DeviceIcon({ type }: { type: Device['type'] }) {
  if (type === 'light') return <Lightbulb size={17} strokeWidth={1.7} />
  if (type === 'sensor') return <Thermometer size={17} strokeWidth={1.7} />
  return <Zap size={17} strokeWidth={1.7} />
}

export function HousePage() {
  const [rooms, setRooms] = useState(initialRooms)
  const [activeRoom, setActiveRoom] = useState('living-room')
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [connectionUrl, setConnectionUrl] = useState('')
  const [connectionState, setConnectionState] = useState<'idle' | 'ready'>('idle')
  const [activeScene, setActiveScene] = useState<string | null>(null)

  const selectedRoom = rooms.find((room) => room.id === activeRoom) ?? rooms[0]

  const allDevices = useMemo(
    () => rooms.flatMap((room) => room.devices),
    [rooms],
  )

  const lightsOn = allDevices.filter(
    (device) => device.type === 'light' && device.state,
  ).length

  const toggleDevice = (roomId: string, deviceId: string) => {
    setRooms((current) =>
      current.map((room) =>
        room.id !== roomId
          ? room
          : {
              ...room,
              devices: room.devices.map((device) =>
                device.id === deviceId
                  ? { ...device, state: !device.state }
                  : device,
              ),
            },
      ),
    )
  }

  const setAllLights = (state: boolean) => {
    setRooms((current) =>
      current.map((room) => ({
        ...room,
        devices: room.devices.map((device) =>
          device.type === 'light' ? { ...device, state } : device,
        ),
      })),
    )
  }

  const activateScene = (scene: string) => {
    setActiveScene(scene)

    if (scene === 'Evening') {
      setAllLights(true)
    }

    if (scene === 'Good night') {
      setAllLights(false)
    }
  }

  return (
    <SectionPage
      eyebrow="House"
      title="The physical world, made useful."
      description="Your home should not just be something Life OS records. It should become something you can understand, control and gradually automate."
    >
      <div className="space-y-14">
        <section className="border-y border-border/70 py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                House control
              </p>
              <h2 className="mt-2 font-serif text-3xl">Your home, right now</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => activateScene('Evening')}
                className="inline-flex items-center gap-2 border border-border px-4 py-2 text-sm transition hover:bg-muted"
              >
                <Moon size={15} />
                Evening
              </button>

              <button
                onClick={() => activateScene('Good night')}
                className="inline-flex items-center gap-2 border border-border px-4 py-2 text-sm transition hover:bg-muted"
              >
                <Power size={15} />
                Good night
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-3">
                <Lightbulb size={19} />
                <span className="text-2xl font-serif">{lightsOn}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">lights currently on</p>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <Home size={19} />
                <span className="text-2xl font-serif">{rooms.length}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">rooms represented</p>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <Radio size={19} />
                <span className="text-2xl font-serif">
                  {connectionState === 'ready' ? 'Connected' : 'Local'}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {connectionState === 'ready'
                  ? 'Home Assistant connection configured'
                  : 'interactive prototype — ready for hardware'}
              </p>
            </div>
          </div>

          {activeScene && (
            <div className="mt-7 flex items-center gap-2 text-sm text-muted-foreground">
              <Check size={15} />
              {activeScene} scene activated.
            </div>
          )}
        </section>

        <section>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Rooms
              </p>
              <h2 className="mt-2 font-serif text-3xl">{selectedRoom.name}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                {selectedRoom.description}
              </p>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-border">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setActiveRoom(room.id)}
                  className={[
                    'whitespace-nowrap px-4 py-2 text-sm transition',
                    activeRoom === room.id
                      ? 'border-b-2 border-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  {room.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7 divide-y divide-border border-y border-border">
            {selectedRoom.devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between gap-4 py-5"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border">
                    <DeviceIcon type={device.type} />
                  </div>

                  <div>
                    <p className="font-medium">{device.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {device.type === 'sensor'
                        ? 'Sensor'
                        : device.state
                          ? 'On'
                          : 'Off'}
                      {device.value ? ` · ${device.value}` : ''}
                    </p>
                  </div>
                </div>

                {device.type === 'sensor' ? (
                  <span className="text-sm font-medium">{device.value}</span>
                ) : (
                  <button
                    onClick={() => toggleDevice(selectedRoom.id, device.id)}
                    className={[
                      'relative h-7 w-12 rounded-full border transition',
                      device.state
                        ? 'border-foreground bg-foreground'
                        : 'border-border bg-muted',
                    ].join(' ')}
                    aria-label={`Control ${device.name}`}
                  >
                    <span
                      className={[
                        'absolute top-1 h-5 w-5 rounded-full transition',
                        device.state
                          ? 'right-1 bg-background'
                          : 'left-1 bg-foreground',
                      ].join(' ')}
                    />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="border-t border-border pt-7">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Scenes
            </p>
            <h2 className="mt-2 font-serif text-3xl">A house that responds</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Scenes let several physical actions become one meaningful action.
              These are prototypes for what will eventually be executed by Home Assistant.
            </p>
          </div>

          <div className="mt-7 grid gap-0 border-y border-border md:grid-cols-3 md:divide-x md:divide-border">
            {[
              {
                name: 'Morning',
                icon: Sun,
                text: 'Bring the house gently to life.',
              },
              {
                name: 'Evening',
                icon: Moon,
                text: 'Create a comfortable evening atmosphere.',
              },
              {
                name: 'Away',
                icon: Power,
                text: 'Put the house into a low-power state.',
              },
            ].map(({ name, icon: Icon, text: sceneText }) => (
              <button
                key={name}
                onClick={() => activateScene(name)}
                className="group flex min-h-36 flex-col justify-between p-6 text-left transition hover:bg-muted/50"
              >
                <Icon size={19} strokeWidth={1.6} />
                <div>
                  <p className="font-serif text-xl">{name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{sceneText}</p>
                </div>
                <ArrowRight
                  size={16}
                  className="mt-5 transition-transform group-hover:translate-x-1"
                />
              </button>
            ))}
          </div>
        </section>

        <section>
          <button
            onClick={() => setSetupOpen(!setupOpen)}
            className="flex w-full items-center justify-between border-y border-border py-6 text-left"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Home Assistant
              </p>
              <h2 className="mt-2 font-serif text-3xl">Connect the physical layer</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Life OS can become the beautiful personal interface on top of a real
                home-automation system.
              </p>
            </div>
            {setupOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>

          {setupOpen && (
            <div className="border-b border-border py-7">
              <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
                <div>
                  <div className="flex items-center gap-3">
                    <Wifi size={18} />
                    <h3 className="font-serif text-xl">Connection</h3>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Once Home Assistant is running, its local API can provide Life OS
                    with device states and control actions.
                  </p>

                  <label className="mt-5 block text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Home Assistant URL
                  </label>

                  <input
                    value={connectionUrl}
                    onChange={(event) => setConnectionUrl(event.target.value)}
                    placeholder="http://homeassistant.local:8123"
                    className="mt-2 w-full border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground"
                  />

                  <button
                    onClick={() => setConnectionState(connectionUrl ? 'ready' : 'idle')}
                    className="mt-3 inline-flex items-center gap-2 border border-foreground px-4 py-2 text-sm transition hover:bg-foreground hover:text-background"
                  >
                    <Settings2 size={15} />
                    {connectionState === 'ready' ? 'Connection saved' : 'Prepare connection'}
                  </button>

                  <p className="mt-3 text-xs text-muted-foreground">
                    Authentication will be added to the secure backend integration rather
                    than storing a long-lived token in the browser.
                  </p>
                </div>

                <div className="border-l-0 border-border lg:border-l lg:pl-8">
                  <div className="flex items-center gap-3">
                    <Sparkles size={18} />
                    <h3 className="font-serif text-xl">What this unlocks</h3>
                  </div>

                  <div className="mt-5 space-y-4 text-sm">
                    {[
                      'Control lights, plugs and other devices from Life OS.',
                      'Read temperatures and other sensor information.',
                      'Create scenes such as Evening, Away and Good morning.',
                      'Trigger automations from time, sunrise, sensors or events.',
                      'Eventually let Atlas connect physical objects to interests and projects.',
                    ].map((item) => (
                      <div key={item} className="flex gap-3">
                        <Check size={16} className="mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section>
          <button
            onClick={() => setTutorialOpen(!tutorialOpen)}
            className="flex w-full items-center justify-between border-y border-border py-6 text-left"
          >
            <div className="flex items-start gap-4">
              <BookOpen size={20} className="mt-1 shrink-0" />
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Field guide
                </p>
                <h2 className="mt-2 font-serif text-3xl">Learn home automation</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  A practical introduction that grows alongside your house.
                </p>
              </div>
            </div>
            {tutorialOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>

          {tutorialOpen && (
            <div className="space-y-0 border-b border-border">
              {[
                [
                  '01',
                  'The hub',
                  'Home Assistant is the central system that knows what devices exist, what state they are in, and what actions they can perform.',
                ],
                [
                  '02',
                  'Devices',
                  'Start small. A single smart plug controlling an ordinary lamp is enough to learn the entire basic control loop.',
                ],
                [
                  '03',
                  'Protocols',
                  'Wi-Fi, Zigbee, Matter and Thread are different ways devices communicate. You do not need to understand all of them before starting.',
                ],
                [
                  '04',
                  'Automations',
                  'An automation connects an event or condition to an action: sunset happens → turn on the living-room lamp.',
                ],
                [
                  '05',
                  'Scenes',
                  'A scene combines several actions into something meaningful: Evening might turn on two lamps while leaving the ceiling light off.',
                ],
                [
                  '06',
                  'Life OS',
                  'Life OS will eventually provide the personal layer above this infrastructure: your rooms, routines, preferences, objects and meaningful controls.',
                ],
              ].map(([number, title, text]) => (
                <div
                  key={number}
                  className="grid gap-4 border-t border-border py-6 md:grid-cols-[60px_180px_1fr]"
                >
                  <span className="font-mono text-xs text-muted-foreground">{number}</span>
                  <h3 className="font-serif text-xl">{title}</h3>
                  <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{text}</p>
                </div>
              ))}

              <div className="flex flex-wrap gap-4 py-6">
                <a
                  href="https://www.home-assistant.io/installation/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm underline underline-offset-4"
                >
                  Home Assistant installation
                  <ExternalLink size={14} />
                </a>
                <a
                  href="https://www.home-assistant.io/getting-started/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm underline underline-offset-4"
                >
                  Getting started
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}
        </section>
      </div>
    </SectionPage>
  )
}