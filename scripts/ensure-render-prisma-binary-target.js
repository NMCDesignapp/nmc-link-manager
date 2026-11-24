const fs = require('fs');
const path = require('path');

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

if (!fs.existsSync(schemaPath)) {
  console.error(`[prisma-target] schema not found: ${schemaPath}`);
  process.exit(1);
}

let schema = fs.readFileSync(schemaPath, 'utf8');
const generatorMatch = schema.match(/generator\s+client\s*\{[\s\S]*?\}/m);

if (!generatorMatch) {
  console.error('[prisma-target] generator client block not found');
  process.exit(1);
}

let generator = generatorMatch[0];
const requiredTarget = 'rhel-openssl-3.0.x';

if (/binaryTargets\s*=/.test(generator)) {
  const targetMatch = generator.match(/binaryTargets\s*=\s*\[([^\]]*)\]/m);
  if (targetMatch && !targetMatch[1].includes(requiredTarget)) {
    const entries = targetMatch[1].trim();
    const replacement = entries
      ? `binaryTargets = [${entries}, "${requiredTarget}"]`
      : `binaryTargets = ["native", "${requiredTarget}"]`;
    generator = generator.replace(/binaryTargets\s*=\s*\[[^\]]*\]/m, replacement);
  }
} else {
  generator = generator.replace(
    /(provider\s*=\s*"prisma-client-js"\s*)/,
    `$1\n  binaryTargets = ["native", "${requiredTarget}"]\n`
  );
}

schema = schema.replace(generatorMatch[0], generator);
fs.writeFileSync(schemaPath, schema);
console.log(`[prisma-target] ensured ${requiredTarget} in ${schemaPath}`);
