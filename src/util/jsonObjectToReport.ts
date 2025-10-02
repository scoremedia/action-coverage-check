import {Counter, Package, Report} from '../models/jacoco'

function getPackage(obj: any): Package[] {
  return obj.package?.map((pkg: any) => ({
    name: pkg['$'].name,
    class: pkg.class?.map((cls: any) => ({
      name: cls['$'].name,
      sourcefilename: cls['$'].sourcefilename,
      method: cls.method?.map((m: any) => ({
        name: m['$'].name,
        desc: m['$'].desc,
        line: m['$'].line ? Number(m['$'].line) : undefined,
        counter: getCounter(m)
      })),
      counter: getCounter(cls)
    })),
    sourcefile: pkg.sourcefile?.map((sf: any) => ({
      name: sf['$'].name,
      line: sf.line?.map((ln: any) => ({
        nr: Number(ln['$'].nr),
        mi: ln['$'].mi ? Number(ln['$'].mi) : undefined,
        ci: ln['$'].ci ? Number(ln['$'].ci) : undefined,
        mb: ln['$'].mb ? Number(ln['$'].mb) : undefined,
        cb: ln['$'].cb ? Number(ln['$'].cb) : undefined
      })),
      counter: getCounter(sf)
    })),
    counter: getCounter(pkg)
  }))
}

function getCounter(obj: any): Counter[] {
  return obj.counter?.map((c: any) => ({
    type: c['$'].type,
    missed: Number(c['$'].missed),
    covered: Number(c['$'].covered)
  }))
}

export function convertObjToReport(obj: any): Report {
  return {
    name: obj['$'].name,
    package: getPackage(obj),
    counter: getCounter(obj)
  }
}
