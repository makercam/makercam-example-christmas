import { cam, cnc, IAnyOperation, make } from '@makercam/makercam'
import makerjs from 'makerjs'

const { feed, log, METRIC, rapid, units } = cam
const fs = require('fs')

function draw() {
    const bigBall = make.ellipse(18, 18)
    const hanger = make.move(make.ellipse(4, 4), [0, 18 + 4 / 2])
    const ballInside = make.offset(bigBall, -2)
    ballInside.layer = 'BallInside'
    const hangerInside = make.offset(hanger, -2)
    hangerInside.layer = 'HangerInside'
    const ballAndHanger = make.union(bigBall, hanger)
    ballAndHanger.layer = 'BallAndHanger'
    const ball = make.move({
        models: {
            ballAndHanger,
            ballInside,
            hangerInside
        }
    }, [20, 20])
    const tajMahal = make.fromSvg(fs.readFileSync('./taj-mahal.svg', 'utf8'))
    tajMahal.layer = 'TajMahal'
    make.move(
        make.scale(
            tajMahal,
            1.5
        ),
        [5, 35]
    )
    const result = make.difference(
        make.move(make.cloneObject(ballInside), [20, 20]),
        tajMahal,
    )
    const chains = makerjs.model.findChains(result) as makerjs.IChain[]
    const models = chains.map(chain => {
        return makerjs.chain.toNewModel(chain)
    })
    models[0].layer = 'TajMahalTop'
    models[1].layer = 'TajMahalBottom'
    models[2].layer = 'TajMahalDoor'
    const tajBall = {
        models: {
            0: models[0],
            1: models[1],
            2: models[2],
            ball,
        }
    }
    const tajBall2 = make.move(
        make.rotate(
            makerjs.cloneObject(tajBall),
            180
        ),
        [60 + 10, 60 + 10]
    )
    const tajBall3 = make.move(
        makerjs.cloneObject(tajBall),
        [60, 0]
    )
    return {
        models: {
            tajBall,
            tajBall2,
            tajBall3,
        }
    }
}

function gcode() {
    const tools = {
        '1mmflatendmill': {
            diameter: 0.8
        }
    }
    const operationsCommon = {
        tool: tools['1mmflatendmill'],
        depth: 1.75,
        depthPerPass: 1.75,
        zSafe: 3
    }
    const operations: IAnyOperation[] = [
        {
            ...operationsCommon,
            id: 'Pocket',
            layers: ['HangerInside'],
            type: 'pocket',
            stockToLeave: 0,
        },
        {
            ...operationsCommon,
            id: 'InsideContour',
            layers: ['HangerInside', 'TajMahalTop', 'TajMahalBottom', 'TajMahalDoor'],
            type: 'contour',
            outside: false,
            tolerance: 1,
        },
        {
            ...operationsCommon,
            id: 'OutsideContour',
            layers: ['BallAndHanger'],
            type: 'contour',
            outside: true,
            tolerance: 1,
        }
    ]
    units(METRIC)
    feed(400)
    rapid({ z: 3 })
    const toolpathDrawing = cnc(draw(), operations)
    rapid({ x: 0, y: 0 })
    log()
    return toolpathDrawing
}


var svg = makerjs.exporter.toSVG(
    make.scale(gcode(), 4)
)
if (typeof document !== 'undefined') {
    document.body.innerHTML = svg
}